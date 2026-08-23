package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "plaid")
public record PlaidProperties(
    String baseUrl,
    String clientId,
    String secret,
    String tokenEncryptionKey
) {
}
