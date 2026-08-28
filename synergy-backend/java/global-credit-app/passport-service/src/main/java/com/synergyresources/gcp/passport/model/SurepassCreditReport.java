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
@Table(name = "surepass_credit_reports")
public class SurepassCreditReport {
  @Id private UUID id;
  @Column(name = "borrower_id", nullable = false) private UUID borrowerId;
  @Column(name = "passport_id", nullable = false) private UUID passportId;
  @Column(nullable = false) private String bureau;
  @Column(name = "provider_reference", nullable = false) private String providerReference;
  @Column(name = "credit_score") private Integer creditScore;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "normalized_report", nullable = false, columnDefinition = "jsonb")
  private JsonNode normalizedReport;
  @Column(name = "consent_version", nullable = false) private String consentVersion;
  @Column(name = "consented_at", nullable = false) private Instant consentedAt;
  @Column(name = "document_storage_key") private String documentStorageKey;
  @Column(name = "document_content_type") private String documentContentType;
  @Column(name = "document_sha256", length = 64) private String documentSha256;
  @Column(name = "document_size_bytes") private Long documentSizeBytes;
  @Column(name = "inherited_from_report_id") private UUID inheritedFromReportId;
  @Column(nullable = false) private String status;
  @Column(name = "created_at", nullable = false) private Instant createdAt;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
    if (status == null) status = "SUCCESS";
  }

  public UUID getId() { return id; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID borrowerId) { this.borrowerId = borrowerId; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID passportId) { this.passportId = passportId; }
  public String getBureau() { return bureau; }
  public void setBureau(String bureau) { this.bureau = bureau; }
  public String getProviderReference() { return providerReference; }
  public void setProviderReference(String value) { providerReference = value; }
  public Integer getCreditScore() { return creditScore; }
  public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
  public JsonNode getNormalizedReport() { return normalizedReport; }
  public void setNormalizedReport(JsonNode value) { normalizedReport = value; }
  public String getConsentVersion() { return consentVersion; }
  public void setConsentVersion(String value) { consentVersion = value; }
  public Instant getConsentedAt() { return consentedAt; }
  public void setConsentedAt(Instant consentedAt) { this.consentedAt = consentedAt; }
  public String getDocumentStorageKey() { return documentStorageKey; }
  public void setDocumentStorageKey(String value) { documentStorageKey = value; }
  public String getDocumentContentType() { return documentContentType; }
  public void setDocumentContentType(String value) { documentContentType = value; }
  public String getDocumentSha256() { return documentSha256; }
  public void setDocumentSha256(String value) { documentSha256 = value; }
  public Long getDocumentSizeBytes() { return documentSizeBytes; }
  public void setDocumentSizeBytes(Long value) { documentSizeBytes = value; }
  public UUID getInheritedFromReportId() { return inheritedFromReportId; }
  public void setInheritedFromReportId(UUID value) { inheritedFromReportId = value; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getCreatedAt() { return createdAt; }
}
