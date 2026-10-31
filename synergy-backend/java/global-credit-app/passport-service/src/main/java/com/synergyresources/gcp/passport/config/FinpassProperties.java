package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "finpass")
public record FinpassProperties(
    boolean enabled,
    String baseUrl,
    String apiKey,
    String apiSecret
) {
}
