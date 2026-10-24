package org.astra.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Utility for accessing security context details and operator identity.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /**
     * Returns the authenticated operator username if present and not anonymous.
     */
    public static Optional<String> getCurrentOperatorUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        String name = auth.getName();
        if (name == null || name.isBlank() || "anonymousUser".equalsIgnoreCase(name)) {
            return Optional.empty();
        }
        return Optional.of(name);
    }
}
