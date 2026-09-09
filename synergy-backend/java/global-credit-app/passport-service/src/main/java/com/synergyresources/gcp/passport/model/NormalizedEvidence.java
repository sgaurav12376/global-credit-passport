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
@Table(name = "normalized_evidence")
public class NormalizedEvidence {
  @Id private UUID id;
  @Column(name = "borrower_id", nullable = false) private UUID borrowerId;
  @Column(name = "passport_id", nullable = false) private UUID passportId;
  @Column(nullable = false) private String domain;
  @Column(name = "country_code", nullable = false, length = 2) private String countryCode;
  @Column(nullable = false) private String provider;
  @Column(name = "source_system", nullable = false) private String sourceSystem;
  @Column(name = "provider_reference") private String providerReference;
  @Column(name = "schema_version", nullable = false) private String schemaVersion;
  @Column(name = "adapter_id", nullable = false) private String adapterId;
  @Column(name = "adapter_version", nullable = false) private String adapterVersion;
  @Column(name = "completeness_percent", nullable = false) private int completenessPercent;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb", updatable = false)
  private JsonNode payload;
  @Column(name = "retrieved_at", nullable = false) private Instant retrievedAt;
  @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

  @PrePersist void prePersist() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getBorrowerId() { return borrowerId; }
  public void setBorrowerId(UUID value) { borrowerId = value; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID value) { passportId = value; }
  public String getDomain() { return domain; }
  public void setDomain(String value) { domain = value; }
  public String getCountryCode() { return countryCode; }
  public void setCountryCode(String value) { countryCode = value; }
  public String getProvider() { return provider; }
  public void setProvider(String value) { provider = value; }
  public String getSourceSystem() { return sourceSystem; }
  public void setSourceSystem(String value) { sourceSystem = value; }
  public String getProviderReference() { return providerReference; }
  public void setProviderReference(String value) { providerReference = value; }
  public String getSchemaVersion() { return schemaVersion; }
  public void setSchemaVersion(String value) { schemaVersion = value; }
  public String getAdapterId() { return adapterId; }
  public void setAdapterId(String value) { adapterId = value; }
  public String getAdapterVersion() { return adapterVersion; }
  public void setAdapterVersion(String value) { adapterVersion = value; }
  public int getCompletenessPercent() { return completenessPercent; }
  public void setCompletenessPercent(int value) { completenessPercent = value; }
  public JsonNode getPayload() { return payload; }
  public void setPayload(JsonNode value) { payload = value; }
  public Instant getRetrievedAt() { return retrievedAt; }
  public void setRetrievedAt(Instant value) { retrievedAt = value; }
  public Instant getCreatedAt() { return createdAt; }
}
