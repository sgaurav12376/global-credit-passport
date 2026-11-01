package com.synergyresources.gcp.passport.entrust;

import com.synergyresources.gcp.passport.config.EntrustProperties;
import com.synergyresources.gcp.passport.model.EntrustVerification;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.repo.EntrustVerificationRepo;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntrustVerificationService {
  private final EntrustClient client;
  private final EntrustProperties properties;
  private final EntrustVerificationRepo verificationRepo;
  private final PassportRepo passportRepo;

  public EntrustVerificationService(
      EntrustClient client,
      EntrustProperties properties,
      EntrustVerificationRepo verificationRepo,
      PassportRepo passportRepo
  ) {
    this.client = client;
    this.properties = properties;
    this.verificationRepo = verificationRepo;
    this.passportRepo = passportRepo;
  }

  @Transactional
  public VerificationResponse start(UUID borrowerId, UUID passportId) {
    Passport passport = editablePassport(borrowerId, passportId);
    var latest = verificationRepo
        .findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId);
    if (latest.isPresent() && active(latest.get().getStatus())) {
      return response(latest.get());
    }

    NameParts name = splitName(passport.getFullName());
    String applicantId = client.createApplicant(
        name.firstName(), name.lastName(), entrustCountry(passport.getResidenceCountry())
    );
    EntrustClient.WorkflowRun run = client.createWorkflowRun(applicantId);

    EntrustVerification verification = new EntrustVerification();
    verification.setBorrowerId(borrowerId);
    verification.setPassportId(passportId);
    verification.setApplicantId(applicantId);
    verification.setWorkflowRunId(run.id());
    verification.setWorkflowId(properties.workflowId());
    verification.setStatus(normalize(run.status()));
    verification.setCaptureUrl(run.captureUrl());
    verification.setProviderError(run.error());
    verificationRepo.save(verification);

    passport.setIdentityStatus("ENTRUST_AWAITING_INPUT");
    passportRepo.save(passport);
    return response(verification);
  }

  @Transactional
  public VerificationResponse refresh(UUID borrowerId, UUID passportId) {
    Passport passport = passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    EntrustVerification verification = verificationRepo
        .findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId)
        .orElseThrow(() -> new IllegalArgumentException("Entrust verification was not started"));

    if (!terminal(verification.getStatus())) {
      EntrustClient.WorkflowRun run = client.getWorkflowRun(verification.getWorkflowRunId());
      String status = normalize(run.status());
      verification.setStatus(status);
      verification.setProviderError(run.error());
      if (run.captureUrl() != null) verification.setCaptureUrl(run.captureUrl());
      applyPassportStatus(passport, verification, status);
      verificationRepo.save(verification);
      passportRepo.save(passport);
    }
    return response(verification);
  }

  @Transactional(readOnly = true)
  public VerificationResponse latest(UUID borrowerId, UUID passportId) {
    passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    return verificationRepo
        .findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId)
        .map(this::response)
        .orElse(null);
  }

  private void applyPassportStatus(
      Passport passport, EntrustVerification verification, String status
  ) {
    switch (status) {
      case "APPROVED" -> {
        Instant completedAt = Instant.now();
        verification.setCompletedAt(completedAt);
        passport.setIdentityStatus("ENTRUST_APPROVED");
        passport.setIdentityCompletedAt(completedAt);
        passport.setIdentityVerifiedName(passport.getFullName());
        passport.setIdentityVerifiedDob(passport.getDob());
      }
      case "DECLINED" -> passport.setIdentityStatus("ENTRUST_DECLINED");
      case "ERROR" -> passport.setIdentityStatus("ENTRUST_ERROR");
      case "ABANDONED" -> passport.setIdentityStatus("ENTRUST_ABANDONED");
      case "PROCESSING", "AWAITING_INPUT" -> passport.setIdentityStatus("ENTRUST_" + status);
      default -> passport.setIdentityStatus("ENTRUST_PROCESSING");
    }
  }

  private Passport editablePassport(UUID borrowerId, UUID passportId) {
    Passport passport = passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    if (!"IN_PROGRESS".equals(passport.getStatus()) && !"DRAFT".equals(passport.getStatus())) {
      throw new IllegalStateException("Start a passport update before verifying identity");
    }
    if (passport.getFullName() == null || passport.getFullName().isBlank() || passport.getDob() == null) {
      throw new IllegalStateException("Save legal name and date of birth before identity verification");
    }
    return passport;
  }

  private NameParts splitName(String fullName) {
    String normalized = fullName.trim().replaceAll("\\s+", " ");
    int split = normalized.lastIndexOf(' ');
    return split < 0
        ? new NameParts(normalized, normalized)
        : new NameParts(normalized.substring(0, split), normalized.substring(split + 1));
  }

  private String entrustCountry(String country) {
    return switch (country.toUpperCase(Locale.ROOT)) {
      case "IN", "IND" -> "IND";
      case "US", "USA" -> "USA";
      default -> country.toUpperCase(Locale.ROOT);
    };
  }

  private String normalize(String status) {
    return status == null ? "PROCESSING" : status.toUpperCase(Locale.ROOT);
  }

  private boolean active(String status) {
    return "AWAITING_INPUT".equals(status) || "PROCESSING".equals(status);
  }

  private boolean terminal(String status) {
    return "APPROVED".equals(status) || "DECLINED".equals(status)
        || "ERROR".equals(status) || "ABANDONED".equals(status)
        || "SUPERSEDED".equals(status);
  }

  private VerificationResponse response(EntrustVerification value) {
    return new VerificationResponse(
        value.getId(), value.getWorkflowRunId(), value.getStatus(), value.getCaptureUrl(),
        value.getProviderError(), value.getStartedAt(), value.getCompletedAt()
    );
  }

  private record NameParts(String firstName, String lastName) {
  }

  public record VerificationResponse(
      UUID verificationId,
      String workflowRunId,
      String status,
      String captureUrl,
      String providerError,
      Instant startedAt,
      Instant completedAt
  ) {
  }
}
