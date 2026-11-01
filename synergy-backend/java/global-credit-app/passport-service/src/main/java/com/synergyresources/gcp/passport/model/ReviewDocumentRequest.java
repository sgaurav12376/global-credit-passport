package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "review_document_requests")
public class ReviewDocumentRequest {
  @Id private UUID id;
  @Column(name = "share_grant_id", nullable = false) private UUID shareGrantId;
  @Column(name = "document_type", nullable = false, length = 100) private String documentType;
  @Column(length = 1000) private String description;
  @Column(name = "is_required", nullable = false) private boolean required;
  @Column(name = "due_date") private LocalDate dueDate;
  @Column(nullable = false, length = 40) private String status;
  @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
  @Column(name = "updated_at", nullable = false) private Instant updatedAt;

  @PrePersist void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (status == null) status = "REQUESTED";
    if (createdAt == null) createdAt = Instant.now();
    if (updatedAt == null) updatedAt = createdAt;
  }

  public UUID getId() { return id; }
  public UUID getShareGrantId() { return shareGrantId; }
  public void setShareGrantId(UUID value) { shareGrantId = value; }
  public String getDocumentType() { return documentType; }
  public void setDocumentType(String value) { documentType = value; }
  public String getDescription() { return description; }
  public void setDescription(String value) { description = value; }
  public boolean isRequired() { return required; }
  public void setRequired(boolean value) { required = value; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate value) { dueDate = value; }
  public String getStatus() { return status; }
  public void setStatus(String value) { status = value; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant value) { updatedAt = value; }
}
