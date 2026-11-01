package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lender_passport_invitations")
public class LenderPassportInvitation {
  @Id private UUID id;
  @Column(name = "token_hash", nullable = false, length = 64, updatable = false) private String tokenHash;
  @Column(name = "lender_name", nullable = false, length = 200) private String lenderName;
  @Column(name = "borrower_name", nullable = false, length = 200) private String borrowerName;
  @Column(nullable = false, length = 200) private String purpose;
  @Column(name = "expires_at", nullable = false) private Instant expiresAt;
  @Column(name = "borrower_id") private UUID borrowerId;
  @Column(name = "passport_id") private UUID passportId;
  @Column(name = "share_grant_id") private UUID shareGrantId;
  @Column(name = "authorized_at") private Instant authorizedAt;
  @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

  @PrePersist void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public String getTokenHash() { return tokenHash; }
  public void setTokenHash(String value) { tokenHash = value; }
  public String getLenderName() { return lenderName; }
  public void setLenderName(String value) { lenderName = value; }
  public String getBorrowerName() { return borrowerName; }
  public void setBorrowerName(String value) { borrowerName = value; }
  public String getPurpose() { return purpose; }
  public void setPurpose(String value) { purpose = value; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant value) { expiresAt = value; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID value) { borrowerId = value; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID value) { passportId = value; }
  public UUID getShareGrantId() { return shareGrantId; }
  public void setShareGrantId(UUID value) { shareGrantId = value; }
  public Instant getAuthorizedAt() { return authorizedAt; }
  public void setAuthorizedAt(Instant value) { authorizedAt = value; }
  public Instant getCreatedAt() { return createdAt; }
}
