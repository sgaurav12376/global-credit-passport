package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "entrust")
public record EntrustProperties(
    boolean enabled,
    String baseUrl,
    String apiToken,
    String workflowId
) {
}
