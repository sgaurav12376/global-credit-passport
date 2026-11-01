package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "crs")
public record CrsProperties(
    boolean enabled,
    String dataMode,
    String baseUrl,
    String bearerToken,
    String equifaxOption,
    String inquiryType
) {
  public boolean fixtureMode() { return "fixture".equalsIgnoreCase(dataMode); }
}
