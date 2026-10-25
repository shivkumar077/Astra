package org.astra.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

/**
 * Spring WebSocket and STOMP message broker configuration for real-time telemetry and simulation events.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Standard WebSocket endpoint
        registry.addEndpoint("/ws/simulation")
                .setAllowedOriginPatterns("*");

        // SockJS fallback endpoint for browsers/proxies lacking direct WebSocket support
        registry.addEndpoint("/ws/simulation")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory message broker prefixes for broadcast topics and point-to-point queues
        registry.enableSimpleBroker("/topic", "/queue");

        // Application prefix for messages routed to @MessageMapping controllers
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Bounded buffers to guard against slow consumers and memory leaks with expanded fleet payloads
        registration.setMessageSizeLimit(512 * 1024)       // 512 KB message limit
                .setSendBufferSizeLimit(1024 * 1024)      // 1024 KB send buffer per session
                .setSendTimeLimit(15 * 1000);             // 15 second send timeout
    }
}
