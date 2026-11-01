package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "passport_share_grants")
public class PassportShareGrant {
  @Id private UUID id;
  @Column(name = "borrower_id", nullable = false) private UUID borrowerId;
  @Column(name = "passport_id", nullable = false) private UUID passportId;
  @Column(name = "output_id", nullable = false) private UUID outputId;
  @Column(name = "token_hash", nullable = false, length = 64) private String tokenHash;
  @Column(name = "recipient_name", nullable = false, length = 200) private String recipientName;
  @Column(nullable = false, length = 200) private String purpose;
  @Column(nullable = false, length = 64) private String scope;
  @Column(name = "consent_version", nullable = false, length = 64) private String consentVersion;
  @Column(name = "consented_at", nullable = false, updatable = false) private Instant consentedAt;
  @Column(name = "expires_at", nullable = false) private Instant expiresAt;
  @Column(name = "revoked_at") private Instant revokedAt;
  @Column(name = "last_accessed_at") private Instant lastAccessedAt;
  @Column(name = "access_count", nullable = false) private long accessCount;
  @Column(name = "review_status", nullable = false, length = 40) private String reviewStatus;
  @Column(name = "review_outcome", length = 40) private String reviewOutcome;
  @Column(name = "borrower_message", length = 2000) private String borrowerMessage;
  @Column(name = "borrower_response", length = 4000) private String borrowerResponse;
  @Column(name = "borrower_responded_at") private Instant borrowerRespondedAt;
  @Column(name = "internal_note", length = 4000) private String internalNote;
  @Column(name = "review_updated_at") private Instant reviewUpdatedAt;
  @Column(name = "review_completed_at") private Instant reviewCompletedAt;
  @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

  @PrePersist void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
    if (consentedAt == null) consentedAt = createdAt;
    if (reviewStatus == null) reviewStatus = "NOT_OPENED";
  }

  public UUID getId() { return id; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID value) { borrowerId = value; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID value) { passportId = value; }
  public UUID getOutputId() { return outputId; }
  public void setOutputId(UUID value) { outputId = value; }
  public String getTokenHash() { return tokenHash; }
  public void setTokenHash(String value) { tokenHash = value; }
  public String getRecipientName() { return recipientName; }
  public void setRecipientName(String value) { recipientName = value; }
  public String getPurpose() { return purpose; }
  public void setPurpose(String value) { purpose = value; }
  public String getScope() { return scope; }
  public void setScope(String value) { scope = value; }
  public String getConsentVersion() { return consentVersion; }
  public void setConsentVersion(String value) { consentVersion = value; }
  public Instant getConsentedAt() { return consentedAt; }
  public void setConsentedAt(Instant value) { consentedAt = value; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant value) { expiresAt = value; }
  public Instant getRevokedAt() { return revokedAt; }
  public void setRevokedAt(Instant value) { revokedAt = value; }
  public Instant getLastAccessedAt() { return lastAccessedAt; }
  public void setLastAccessedAt(Instant value) { lastAccessedAt = value; }
  public long getAccessCount() { return accessCount; }
  public void setAccessCount(long value) { accessCount = value; }
  public String getReviewStatus() { return reviewStatus; }
  public void setReviewStatus(String value) { reviewStatus = value; }
  public String getReviewOutcome() { return reviewOutcome; }
  public void setReviewOutcome(String value) { reviewOutcome = value; }
  public String getBorrowerMessage() { return borrowerMessage; }
  public void setBorrowerMessage(String value) { borrowerMessage = value; }
  public String getBorrowerResponse() { return borrowerResponse; }
  public void setBorrowerResponse(String value) { borrowerResponse = value; }
  public Instant getBorrowerRespondedAt() { return borrowerRespondedAt; }
  public void setBorrowerRespondedAt(Instant value) { borrowerRespondedAt = value; }
  public String getInternalNote() { return internalNote; }
  public void setInternalNote(String value) { internalNote = value; }
  public Instant getReviewUpdatedAt() { return reviewUpdatedAt; }
  public void setReviewUpdatedAt(Instant value) { reviewUpdatedAt = value; }
  public Instant getReviewCompletedAt() { return reviewCompletedAt; }
  public void setReviewCompletedAt(Instant value) { reviewCompletedAt = value; }
  public Instant getCreatedAt() { return createdAt; }
}
