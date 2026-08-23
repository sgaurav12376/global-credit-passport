package com.synergyresources.gcp.passport.security;

import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public final class CurrentBorrower {
  private CurrentBorrower() {
  }

  public static UUID id() {
    String authMode = System.getenv().getOrDefault("GCP_AUTH_MODE", "cognito");
    if ("local".equalsIgnoreCase(authMode)) {
      String configuredId = System.getenv().getOrDefault(
          "GCP_LOCAL_BORROWER_ID",
          "00000000-0000-0000-0000-000000000001"
      );
      try {
        return UUID.fromString(configuredId);
      } catch (IllegalArgumentException exception) {
        throw new IllegalStateException("GCP_LOCAL_BORROWER_ID must be a valid UUID");
      }
    }

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
      throw new AccessDeniedException("Authenticated Cognito user is required");
    }
    try {
      return UUID.fromString(jwt.getSubject());
    } catch (IllegalArgumentException exception) {
      throw new AccessDeniedException("Cognito subject is not a valid borrower UUID");
    }
  }
}
