package com.synergyresources.gcp.passport.normalization;

import java.time.Instant;

public record NormalizationContext(
    String countryCode,
    String provider,
    String sourceSystem,
    String providerReference,
    String consentVersion,
    Instant consentedAt,
    Instant retrievedAt,
    String documentSha256
) {
}
