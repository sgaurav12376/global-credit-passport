package com.synergyresources.gcp.passport.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "passport_outputs")
public class PassportOutput {
  @Id private UUID id;
  @Column(name = "borrower_id", nullable = false) private UUID borrowerId;
  @Column(name = "passport_id", nullable = false) private UUID passportId;
  @Column(name = "schema_version", nullable = false) private String schemaVersion;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "document", nullable = false, columnDefinition = "jsonb", updatable = false)
  private JsonNode document;
  @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID value) { borrowerId = value; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID value) { passportId = value; }
  public String getSchemaVersion() { return schemaVersion; }
  public void setSchemaVersion(String value) { schemaVersion = value; }
  public JsonNode getDocument() { return document; }
  public void setDocument(JsonNode value) { document = value; }
  public Instant getCreatedAt() { return createdAt; }
}
