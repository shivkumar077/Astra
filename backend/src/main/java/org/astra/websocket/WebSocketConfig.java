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

    @org.springframework.beans.factory.annotation.Value("${astra.security.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173}")
    private String allowedOriginsConfig;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        java.util.List<String> origins = java.util.Arrays.stream(allowedOriginsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        String[] originPatterns = origins.isEmpty() ? new String[]{"*"} : origins.toArray(new String[0]);

        // Standard WebSocket endpoint
        registry.addEndpoint("/ws/simulation")
                .setAllowedOriginPatterns(originPatterns);

        // SockJS fallback endpoint for browsers/proxies lacking direct WebSocket support
        registry.addEndpoint("/ws/simulation")
                .setAllowedOriginPatterns(originPatterns)
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
