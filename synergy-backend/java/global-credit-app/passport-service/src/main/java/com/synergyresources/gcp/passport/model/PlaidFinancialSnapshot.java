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
@Table(name = "plaid_financial_snapshots")
public class PlaidFinancialSnapshot {
  @Id
  private UUID id;

  @Column(name = "borrower_id", nullable = false)
  private UUID borrowerId;

  @Column(name = "passport_id", nullable = false)
  private UUID passportId;

  @Column(name = "methodology_version", nullable = false)
  private String methodologyVersion;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "summary", nullable = false, columnDefinition = "jsonb", updatable = false)
  private JsonNode summary;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "source_item_ids", nullable = false, columnDefinition = "jsonb", updatable = false)
  private JsonNode sourceItemIds;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID borrowerId) { this.borrowerId = borrowerId; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID passportId) { this.passportId = passportId; }
  public String getMethodologyVersion() { return methodologyVersion; }
  public void setMethodologyVersion(String methodologyVersion) {
    this.methodologyVersion = methodologyVersion;
  }
  public JsonNode getSummary() { return summary; }
  public void setSummary(JsonNode summary) { this.summary = summary; }
  public JsonNode getSourceItemIds() { return sourceItemIds; }
  public void setSourceItemIds(JsonNode sourceItemIds) { this.sourceItemIds = sourceItemIds; }
  public Instant getCreatedAt() { return createdAt; }
}
