package com.synergyresources.gcp.passport.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="passport_sources")
public class PassportSource {
  @Id private UUID id;

  @Column(name="passport_id", nullable=false) private UUID passportId;
  @Column(name="source_type", nullable=false) private String sourceType;
  @Column(nullable=false) private boolean connected;

  @Column(name="created_at", nullable=false) private Instant createdAt;
  @Column(name="updated_at", nullable=false) private Instant updatedAt;

  @PrePersist void prePersist() {
    var now = Instant.now();
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }
  @PreUpdate void preUpdate() { updatedAt = Instant.now(); }

  public UUID getId() { return id; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID passportId) { this.passportId = passportId; }
  public String getSourceType() { return sourceType; }
  public void setSourceType(String sourceType) { this.sourceType = sourceType; }
  public boolean isConnected() { return connected; }
  public void setConnected(boolean connected) { this.connected = connected; }
}
