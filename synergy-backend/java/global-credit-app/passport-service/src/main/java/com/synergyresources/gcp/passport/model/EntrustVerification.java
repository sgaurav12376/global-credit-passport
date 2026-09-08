package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "entrust_verifications")
public class EntrustVerification {
  @Id private UUID id;
  @Column(name = "borrower_id", nullable = false) private UUID borrowerId;
  @Column(name = "passport_id", nullable = false) private UUID passportId;
  @Column(name = "applicant_id", nullable = false) private String applicantId;
  @Column(name = "workflow_run_id", nullable = false, unique = true) private String workflowRunId;
  @Column(name = "workflow_id", nullable = false) private String workflowId;
  @Column(nullable = false) private String status;
  @Column(name = "capture_url") private String captureUrl;
  @Column(name = "provider_error") private String providerError;
  @Column(name = "started_at", nullable = false) private Instant startedAt;
  @Column(name = "completed_at") private Instant completedAt;
  @Column(name = "created_at", nullable = false) private Instant createdAt;
  @Column(name = "updated_at", nullable = false) private Instant updatedAt;

  @PrePersist void prePersist() {
    Instant now = Instant.now();
    if (id == null) id = UUID.randomUUID();
    if (startedAt == null) startedAt = now;
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }
  @PreUpdate void preUpdate() { updatedAt = Instant.now(); }

  public UUID getId() { return id; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID value) { borrowerId = value; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID value) { passportId = value; }
  public String getApplicantId() { return applicantId; }
  public void setApplicantId(String value) { applicantId = value; }
  public String getWorkflowRunId() { return workflowRunId; }
  public void setWorkflowRunId(String value) { workflowRunId = value; }
  public String getWorkflowId() { return workflowId; }
  public void setWorkflowId(String value) { workflowId = value; }
  public String getStatus() { return status; }
  public void setStatus(String value) { status = value; }
  public String getCaptureUrl() { return captureUrl; }
  public void setCaptureUrl(String value) { captureUrl = value; }
  public String getProviderError() { return providerError; }
  public void setProviderError(String value) { providerError = value; }
  public Instant getStartedAt() { return startedAt; }
  public Instant getCompletedAt() { return completedAt; }
  public void setCompletedAt(Instant value) { completedAt = value; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
