package org.astra.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.astra.api.dto.ApiErrorResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration establishing Role-Based Access Control (RBAC),
 * stateless REST authentication, CORS policies, and auditable security boundaries.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;

    public SecurityConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(
            PasswordEncoder encoder,
            @Value("${astra.security.users.viewer.username:viewer}") String viewerUser,
            @Value("${astra.security.users.viewer.password:viewer123}") String viewerPass,
            @Value("${astra.security.users.operator.username:operator}") String operatorUser,
            @Value("${astra.security.users.operator.password:operator123}") String operatorPass,
            @Value("${astra.security.users.flight-director.username:director}") String directorUser,
            @Value("${astra.security.users.flight-director.password:director123}") String directorPass,
            @Value("${astra.security.users.admin.username:admin}") String adminUser,
            @Value("${astra.security.users.admin.password:admin123}") String adminPass
    ) {
        UserDetails viewer = User.builder()
                .username(viewerUser)
                .password(encoder.encode(viewerPass))
                .roles("VIEWER")
                .build();

        UserDetails operator = User.builder()
                .username(operatorUser)
                .password(encoder.encode(operatorPass))
                .roles("OPERATOR", "VIEWER")
                .build();

        UserDetails flightDirector = User.builder()
                .username(directorUser)
                .password(encoder.encode(directorPass))
                .roles("FLIGHT_DIRECTOR", "OPERATOR", "VIEWER")
                .build();

        UserDetails admin = User.builder()
                .username(adminUser)
                .password(encoder.encode(adminPass))
                .roles("ADMIN", "FLIGHT_DIRECTOR", "OPERATOR", "VIEWER")
                .build();

        return new InMemoryUserDetailsManager(viewer, operator, flightDirector, admin);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(customAuthenticationEntryPoint())
                        .accessDeniedHandler(customAccessDeniedHandler())
                )
                .authorizeHttpRequests(auth -> auth
                        // 1. CORS Preflight OPTIONS requests
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 2. Actuator health & info endpoints
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/actuator/health", "/actuator/info").permitAll()

                        // 3. WebSocket & STOMP transport
                        .requestMatchers("/ws/**").permitAll()

                        // 4. Public read-only queries (telemetry, spacecraft, simulation status, scenarios, space imagery)
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/simulation/status",
                                "/api/v1/simulation/continuous/status",
                                "/api/v1/spacecraft/**",
                                "/api/v1/faults/scenarios",
                                "/api/v1/faults/**",
                                "/api/v1/commands/**",
                                "/api/v1/events/**",
                                "/api/v1/anomalies/**",
                                "/api/v1/imagery/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.HEAD,
                                "/api/v1/simulation/status",
                                "/api/v1/simulation/continuous/status",
                                "/api/v1/spacecraft/**",
                                "/api/v1/faults/scenarios",
                                "/api/v1/faults/**",
                                "/api/v1/commands/**",
                                "/api/v1/events/**",
                                "/api/v1/anomalies/**",
                                "/api/v1/imagery/**"
                        ).permitAll()

                        // 4. Operator command execution & simulation clock advancement
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/commands/**",
                                "/api/v1/spacecraft/*/commands",
                                "/api/v1/simulation/advance",
                                "/api/v1/simulation/pause",
                                "/api/v1/simulation/resume"
                        ).hasAnyRole("OPERATOR", "FLIGHT_DIRECTOR", "ADMIN")

                        // 5. Flight Director Failure Lab operations (fault injection, recovery, clearance)
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/faults/inject",
                                "/api/v1/faults/*/recover",
                                "/api/v1/anomalies/inject"
                        ).hasAnyRole("FLIGHT_DIRECTOR", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE,
                                "/api/v1/faults/*",
                                "/api/v1/anomalies/*"
                        ).hasAnyRole("FLIGHT_DIRECTOR", "ADMIN")

                        // 6. Administrative configuration & simulation reset
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/simulation/initialize",
                                "/api/v1/simulation/continuous/start",
                                "/api/v1/simulation/continuous/stop"
                        ).hasRole("ADMIN")

                        // 7. Everything else requires authentication
                        .anyRequest().authenticated()
                )
                .httpBasic(basic -> basic.authenticationEntryPoint(customAuthenticationEntryPoint()));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationEntryPoint customAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiErrorResponse error = ApiErrorResponse.of(
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Unauthorized",
                    "Authentication required: " + authException.getMessage(),
                    request.getRequestURI()
            );
            objectMapper.writeValue(response.getOutputStream(), error);
        };
    }

    @Bean
    public AccessDeniedHandler customAccessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiErrorResponse error = ApiErrorResponse.of(
                    HttpServletResponse.SC_FORBIDDEN,
                    "Forbidden",
                    "Access denied: Insufficient privileges for requested operation.",
                    request.getRequestURI()
            );
            objectMapper.writeValue(response.getOutputStream(), error);
        };
    }
}
