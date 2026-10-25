/**
 * Lightweight, zero-dependency STOMP 1.1/1.2 WebSocket client for ASTRA Mission Control.
 * Connects directly to backend Spring WebSocket MessageBroker at /ws/simulation.
 */

export type StompConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface StompMessage<T = unknown> {
  command: string;
  headers: Record<string, string>;
  body: T;
}

export type MessageHandler<T = unknown> = (data: T, headers: Record<string, string>) => void;

export class AstraStompClient {
  private ws: WebSocket | null = null;
  private url: string;
  private status: StompConnectionStatus = 'disconnected';
  private subscriptions = new Map<string, { destination: string; handler: MessageHandler }>();
  private subCounter = 0;
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;
  private statusListeners: Array<(status: StompConnectionStatus) => void> = [];
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelayMs = 15000;
  private readonly baseReconnectDelayMs = 1500;

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8080';
      this.url = `${isHttps ? 'wss:' : 'ws:'}//${host}/ws/simulation`;
    }
  }

  public getStatus(): StompConnectionStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: StompConnectionStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(newStatus: StompConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((l) => l(newStatus));
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    if (this.reconnectAttempts > 0) {
      this.setStatus('reconnecting');
    } else {
      this.setStatus('connecting');
    }

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      // Send STOMP CONNECT frame
      const connectFrame = [
        'CONNECT',
        'accept-version:1.1,1.2',
        'heart-beat:10000,10000',
        '',
        '',
      ].join('\n') + '\0';

      this.ws?.send(connectFrame);
    };

    this.ws.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };

    this.ws.onerror = () => {
      this.setStatus('error');
    };

    this.ws.onclose = () => {
      if (this.status !== 'error') {
        this.setStatus('disconnected');
      }
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    // Exponential backoff with jitter: base * 2^(attempts-1) capped at maxReconnectDelayMs
    const expDelay = Math.min(
      this.maxReconnectDelayMs,
      this.baseReconnectDelayMs * Math.pow(1.5, Math.min(this.reconnectAttempts - 1, 6))
    );
    this.setStatus('reconnecting');
    this.reconnectTimer = window.setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, expDelay);
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('DISCONNECT\n\n\0');
        }
        this.ws.close();
      } catch {
        // Safe close
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public subscribe<T = unknown>(destination: string, handler: MessageHandler<T>): () => void {
    const subId = `sub-${this.subCounter++}`;
    this.subscriptions.set(subId, {
      destination,
      handler: handler as MessageHandler,
    });

    // If already connected, immediately send STOMP SUBSCRIBE frame
    if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribeFrame(subId, destination);
    }

    // Return un-subscribe cleanup callback
    return () => {
      this.subscriptions.delete(subId);
      if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
        const frame = `UNSUBSCRIBE\nid:${subId}\n\n\0`;
        this.ws.send(frame);
      }
    };
  }

  private sendSubscribeFrame(subId: string, destination: string) {
    const frame = [
      'SUBSCRIBE',
      `id:${subId}`,
      `destination:${destination}`,
      'ack:auto',
      '',
      '',
    ].join('\n') + '\0';

    this.ws?.send(frame);
  }

  private handleIncomingData(raw: string) {
    // STOMP frames can be null-byte terminated or heartbeat newlines
    if (raw === '\n' || raw === '\r\n') {
      return; // Heartbeat Ping
    }

    const frameStrings = raw.split('\0');
    for (const frameStr of frameStrings) {
      const trimmed = frameStr.trim();
      if (!trimmed) continue;

      const [headerPart, ...bodyParts] = trimmed.split('\n\n');
      const body = bodyParts.join('\n\n');
      const headerLines = headerPart.split('\n');
      const command = headerLines[0]?.trim();

      const headers: Record<string, string> = {};
      for (let i = 1; i < headerLines.length; i++) {
        const line = headerLines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const k = line.substring(0, colonIdx).trim();
          const v = line.substring(colonIdx + 1).trim();
          headers[k] = v;
        }
      }

      if (command === 'CONNECTED') {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        // Re-subscribe all active topic subscriptions
        this.subscriptions.forEach((sub, id) => {
          this.sendSubscribeFrame(id, sub.destination);
        });

        // Setup client heartbeat ping (every 10s)
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('\n');
          }
        }, 10000);
      } else if (command === 'MESSAGE') {
        const subId = headers['subscription'];
        const sub = this.subscriptions.get(subId);
        if (sub) {
          let parsedData: unknown = body;
          try {
            parsedData = JSON.parse(body);
          } catch {
            // Raw text payload
          }
          sub.handler(parsedData, headers);
        }
      } else if (command === 'ERROR') {
        console.warn('[ASTRA STOMP Protocol Alert]', headers['message'] || body);
      }
    }
  }
}

// Global shared STOMP singleton instance for Mission Control
let stompInstance: AstraStompClient | null = null;

export function getMissionControlStompClient(): AstraStompClient {
  if (!stompInstance) {
    stompInstance = new AstraStompClient();
  }
  return stompInstance;
}
