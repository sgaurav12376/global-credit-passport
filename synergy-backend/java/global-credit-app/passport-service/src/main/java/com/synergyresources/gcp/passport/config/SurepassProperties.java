package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "surepass")
public record SurepassProperties(
    boolean enabled,
    String baseUrl,
    String bearerToken,
    String documentDirectory,
    long maxDocumentBytes
) {
}
