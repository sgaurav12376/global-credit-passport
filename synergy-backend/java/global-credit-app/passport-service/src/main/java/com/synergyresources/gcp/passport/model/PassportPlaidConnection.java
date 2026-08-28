package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "passport_plaid_connections")
public class PassportPlaidConnection {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "borrower_id", nullable = false) private UUID borrowerId;
  @Column(name = "passport_id", nullable = false) private UUID passportId;
  @Column(name = "plaid_connection_id", nullable = false) private UUID plaidConnectionId;
  @Column(name = "consent_version", nullable = false) private String consentVersion;
  @Column(name = "consented_at", nullable = false) private Instant consentedAt;
  @Column(nullable = false) private boolean active;
  @Column(name = "attached_at", nullable = false) private Instant attachedAt;

  @PrePersist
  void prePersist() {
    if (consentedAt == null) consentedAt = Instant.now();
    if (attachedAt == null) attachedAt = Instant.now();
  }

  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID value) { borrowerId = value; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID value) { passportId = value; }
  public UUID getPlaidConnectionId() { return plaidConnectionId; }
  public void setPlaidConnectionId(UUID value) { plaidConnectionId = value; }
  public String getConsentVersion() { return consentVersion; }
  public void setConsentVersion(String value) { consentVersion = value; }
  public Instant getConsentedAt() { return consentedAt; }
  public void setConsentedAt(Instant value) { consentedAt = value; }
  public boolean isActive() { return active; }
  public void setActive(boolean value) { active = value; }
}
