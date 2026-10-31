package com.synergyresources.gcp.passport.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "review_document_submissions")
public class ReviewDocumentSubmission {
  @Id private UUID id;
  @Column(name = "request_id", nullable = false) private UUID requestId;
  @Column(name = "storage_key", nullable = false, length = 500) private String storageKey;
  @Column(name = "original_filename", nullable = false, length = 255) private String originalFilename;
  @Column(name = "content_type", nullable = false, length = 100) private String contentType;
  @Column(name = "size_bytes", nullable = false) private long sizeBytes;
  @Column(name = "uploaded_at", nullable = false, updatable = false) private Instant uploadedAt;
  @Column(name = "superseded_at") private Instant supersededAt;

  @PrePersist void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (uploadedAt == null) uploadedAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getRequestId() { return requestId; }
  public void setRequestId(UUID value) { requestId = value; }
  public String getStorageKey() { return storageKey; }
  public void setStorageKey(String value) { storageKey = value; }
  public String getOriginalFilename() { return originalFilename; }
  public void setOriginalFilename(String value) { originalFilename = value; }
  public String getContentType() { return contentType; }
  public void setContentType(String value) { contentType = value; }
  public long getSizeBytes() { return sizeBytes; }
  public void setSizeBytes(long value) { sizeBytes = value; }
  public Instant getUploadedAt() { return uploadedAt; }
  public Instant getSupersededAt() { return supersededAt; }
  public void setSupersededAt(Instant value) { supersededAt = value; }
}
