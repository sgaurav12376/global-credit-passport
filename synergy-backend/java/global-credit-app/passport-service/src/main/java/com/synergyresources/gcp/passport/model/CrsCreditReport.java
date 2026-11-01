package com.synergyresources.gcp.passport.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "crs_credit_reports")
public class CrsCreditReport {
  @Id private UUID id;
  @Column(name="borrower_id", nullable=false) private UUID borrowerId;
  @Column(name="passport_id", nullable=false) private UUID passportId;
  @Column(nullable=false) private String bureau;
  @Column(name="provider_reference", nullable=false) private String providerReference;
  @Column(name="request_id") private String requestId;
  @Column(name="credit_score") private Integer creditScore;
  @JdbcTypeCode(SqlTypes.JSON) @Column(name="normalized_report", nullable=false, columnDefinition="jsonb")
  private JsonNode normalizedReport;
  @Column(name="consent_version", nullable=false) private String consentVersion;
  @Column(name="consented_at", nullable=false) private Instant consentedAt;
  @Column(name="data_mode", nullable=false) private String dataMode;
  @Column(name="permissible_purpose", nullable=false) private String permissiblePurpose;
  @Column(name="inquiry_type", nullable=false) private String inquiryType;
  @Column(nullable=false) private String status;
  @Column(name="created_at", nullable=false) private Instant createdAt;
  @PrePersist void prePersist(){ if(id==null)id=UUID.randomUUID(); if(createdAt==null)createdAt=Instant.now(); if(status==null)status="SUCCESS"; }
  public UUID getId(){return id;} public UUID getBorrowerId(){return borrowerId;} public void setBorrowerId(UUID v){borrowerId=v;}
  public UUID getPassportId(){return passportId;} public void setPassportId(UUID v){passportId=v;}
  public String getBureau(){return bureau;} public void setBureau(String v){bureau=v;}
  public String getProviderReference(){return providerReference;} public void setProviderReference(String v){providerReference=v;}
  public String getRequestId(){return requestId;} public void setRequestId(String v){requestId=v;}
  public Integer getCreditScore(){return creditScore;} public void setCreditScore(Integer v){creditScore=v;}
  public JsonNode getNormalizedReport(){return normalizedReport;} public void setNormalizedReport(JsonNode v){normalizedReport=v;}
  public String getConsentVersion(){return consentVersion;} public void setConsentVersion(String v){consentVersion=v;}
  public Instant getConsentedAt(){return consentedAt;} public void setConsentedAt(Instant v){consentedAt=v;}
  public String getDataMode(){return dataMode;} public void setDataMode(String v){dataMode=v;}
  public String getPermissiblePurpose(){return permissiblePurpose;} public void setPermissiblePurpose(String v){permissiblePurpose=v;}
  public String getInquiryType(){return inquiryType;} public void setInquiryType(String v){inquiryType=v;}
  public String getStatus(){return status;} public void setStatus(String v){status=v;}
  public Instant getCreatedAt(){return createdAt;}
}
