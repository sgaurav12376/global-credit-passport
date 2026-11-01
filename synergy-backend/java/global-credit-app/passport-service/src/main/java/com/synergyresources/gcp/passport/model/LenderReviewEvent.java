package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lender_review_events")
public class LenderReviewEvent {
  @Id private UUID id;
  @Column(name = "share_grant_id", nullable = false) private UUID shareGrantId;
  @Column(name = "event_type", nullable = false, length = 40) private String eventType;
  @Column(name = "from_status", length = 40) private String fromStatus;
  @Column(name = "to_status", nullable = false, length = 40) private String toStatus;
  @Column(name = "borrower_message", length = 2000) private String borrowerMessage;
  @Column(name = "borrower_response", length = 4000) private String borrowerResponse;
  @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

  @PrePersist void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getShareGrantId() { return shareGrantId; }
  public void setShareGrantId(UUID value) { shareGrantId = value; }
  public String getEventType() { return eventType; }
  public void setEventType(String value) { eventType = value; }
  public String getFromStatus() { return fromStatus; }
  public void setFromStatus(String value) { fromStatus = value; }
  public String getToStatus() { return toStatus; }
  public void setToStatus(String value) { toStatus = value; }
  public String getBorrowerMessage() { return borrowerMessage; }
  public void setBorrowerMessage(String value) { borrowerMessage = value; }
  public String getBorrowerResponse() { return borrowerResponse; }
  public void setBorrowerResponse(String value) { borrowerResponse = value; }
  public Instant getCreatedAt() { return createdAt; }
}
