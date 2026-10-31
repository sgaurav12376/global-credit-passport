package com.synergyresources.gcp.passport.service;

import java.time.Instant;
import java.util.UUID;

public record ReviewChangedEvent(
    UUID passportId, UUID shareId, String eventType, Instant updatedAt
) {}
