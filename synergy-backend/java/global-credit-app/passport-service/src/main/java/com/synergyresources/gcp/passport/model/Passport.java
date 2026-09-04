package com.synergyresources.gcp.passport.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name="passports")
public class Passport {
  @Id private UUID id;

  @Column(name="user_id", nullable=false) private UUID userId;
  @Column(nullable=false) private String purpose;
  @Column(name="origin_country", nullable=false) private String originCountry;
  @Column(name="dest_country", nullable=false) private String destCountry;

  @Column(name="full_name") private String fullName;
  @Column(name="dob") private LocalDate dob;
  @Column(name="supersedes_passport_id") private UUID supersedesPassportId;
  @Column(name="identity_status", nullable=false) private String identityStatus;
  @Column(name="identity_completed_at") private Instant identityCompletedAt;
  @Column(name="identity_verified_name") private String identityVerifiedName;
  @Column(name="identity_verified_dob") private LocalDate identityVerifiedDob;
  @Column(name="current_section", nullable=false) private String currentSection;

  @Column(nullable=false) private String status;

  @Column(name="created_at", nullable=false) private Instant createdAt;
  @Column(name="updated_at", nullable=false) private Instant updatedAt;

  @PrePersist void prePersist() {
    var now = Instant.now();
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
    if (status == null) status = "DRAFT";
    if (identityStatus == null) identityStatus = "NOT_STARTED";
    if (currentSection == null) currentSection = "PURPOSE";
  }
  @PreUpdate void preUpdate() { updatedAt = Instant.now(); }

  public UUID getId() { return id; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public String getPurpose() { return purpose; }
  public void setPurpose(String purpose) { this.purpose = purpose; }
  public String getOriginCountry() { return originCountry; }
  public void setOriginCountry(String originCountry) { this.originCountry = originCountry; }
  public String getDestCountry() { return destCountry; }
  public void setDestCountry(String destCountry) { this.destCountry = destCountry; }
  public String getFullName() { return fullName; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public LocalDate getDob() { return dob; }
  public void setDob(LocalDate dob) { this.dob = dob; }
  public UUID getSupersedesPassportId() { return supersedesPassportId; }
  public void setSupersedesPassportId(UUID value) { supersedesPassportId = value; }
  public String getIdentityStatus() { return identityStatus; }
  public void setIdentityStatus(String value) { identityStatus = value; }
  public Instant getIdentityCompletedAt() { return identityCompletedAt; }
  public void setIdentityCompletedAt(Instant value) { identityCompletedAt = value; }
  public String getIdentityVerifiedName() { return identityVerifiedName; }
  public void setIdentityVerifiedName(String value) { identityVerifiedName = value; }
  public LocalDate getIdentityVerifiedDob() { return identityVerifiedDob; }
  public void setIdentityVerifiedDob(LocalDate value) { identityVerifiedDob = value; }
  public String getCurrentSection() { return currentSection; }
  public void setCurrentSection(String value) { currentSection = value; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
