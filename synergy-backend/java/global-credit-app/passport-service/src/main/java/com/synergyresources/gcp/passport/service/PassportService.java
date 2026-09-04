package com.synergyresources.gcp.passport.service;

import com.synergyresources.gcp.passport.api.Dto;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PassportPlaidConnection;
import com.synergyresources.gcp.passport.model.PassportSource;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PassportSourceRepo;
import com.synergyresources.gcp.passport.repo.PassportPlaidConnectionRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import com.synergyresources.gcp.passport.plaid.PlaidFinancialSnapshotService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import java.util.List;
import java.time.Instant;
import java.util.Objects;

@Service
public class PassportService {
  private final PassportRepo passportRepo;
  private final PassportSourceRepo sourceRepo;
  private final PlaidFinancialSnapshotService plaidSnapshotService;
  private final PassportPlaidConnectionRepo passportPlaidConnectionRepo;
  private final SurepassCreditReportRepo surepassReportRepo;

  public PassportService(
      PassportRepo passportRepo,
      PassportSourceRepo sourceRepo,
      PlaidFinancialSnapshotService plaidSnapshotService,
      PassportPlaidConnectionRepo passportPlaidConnectionRepo,
      SurepassCreditReportRepo surepassReportRepo
  ) {
    this.passportRepo = passportRepo;
    this.sourceRepo = sourceRepo;
    this.plaidSnapshotService = plaidSnapshotService;
    this.passportPlaidConnectionRepo = passportPlaidConnectionRepo;
    this.surepassReportRepo = surepassReportRepo;
  }

  @Transactional
  public Dto.InitResponse init(UUID userId, Dto.InitRequest req) {
    Passport supersededPassport = null;
    if (req.supersedesPassportId != null) {
      supersededPassport = passportRepo.findByIdAndUserId(req.supersedesPassportId, userId)
          .orElseThrow(() -> new IllegalArgumentException(
              "Superseded passport was not found for the current borrower"
          ));
    }
    Passport p = new Passport();
    p.setUserId(userId);
    p.setPurpose(req.purpose);
    p.setOriginCountry(req.originCountry);
    p.setDestCountry(req.destCountry);
    p.setFullName(req.fullName);
    p.setDob(req.dob);
    p.setSupersedesPassportId(req.supersedesPassportId);
    p.setCurrentSection(supersededPassport == null ? "PURPOSE" : "OVERVIEW");
    if (supersededPassport != null) {
      p.setIdentityStatus(supersededPassport.getIdentityStatus());
      p.setIdentityCompletedAt(supersededPassport.getIdentityCompletedAt());
      p.setIdentityVerifiedName(supersededPassport.getIdentityVerifiedName());
      p.setIdentityVerifiedDob(supersededPassport.getIdentityVerifiedDob());
    }
    p.setStatus("IN_PROGRESS");
    passportRepo.saveAndFlush(p);

    if (supersededPassport != null) {
      List<PassportPlaidConnection> carriedConnections =
          passportPlaidConnectionRepo
              .findAllByBorrowerIdAndPassportIdAndActiveTrue(
                  userId, supersededPassport.getId()
              )
              .stream()
              .map(previous -> {
                PassportPlaidConnection carried = new PassportPlaidConnection();
                carried.setBorrowerId(userId);
                carried.setPassportId(p.getId());
                carried.setPlaidConnectionId(previous.getPlaidConnectionId());
                carried.setConsentVersion(previous.getConsentVersion());
                carried.setConsentedAt(previous.getConsentedAt());
                carried.setActive(true);
                return carried;
              })
              .toList();
      passportPlaidConnectionRepo.saveAll(carriedConnections);

      surepassReportRepo
          .findFirstByBorrowerIdAndPassportIdAndStatusOrderByCreatedAtDesc(
              userId, supersededPassport.getId(), "SUCCESS"
          )
          .ifPresent(previous -> {
            SurepassCreditReport carried = new SurepassCreditReport();
            carried.setBorrowerId(userId);
            carried.setPassportId(p.getId());
            carried.setBureau(previous.getBureau());
            carried.setProviderReference(previous.getProviderReference());
            carried.setCreditScore(previous.getCreditScore());
            carried.setNormalizedReport(previous.getNormalizedReport());
            carried.setConsentVersion(previous.getConsentVersion());
            carried.setConsentedAt(previous.getConsentedAt());
            carried.setStatus("SUCCESS");
            carried.setDocumentStorageKey(previous.getDocumentStorageKey());
            carried.setDocumentContentType(previous.getDocumentContentType());
            carried.setDocumentSha256(previous.getDocumentSha256());
            carried.setDocumentSizeBytes(previous.getDocumentSizeBytes());
            carried.setInheritedFromReportId(previous.getId());
            surepassReportRepo.save(carried);
          });
    }

    return new Dto.InitResponse(p.getId(), p.getStatus());
  }

  @Transactional
  public Dto.InitResponse getOrCreateUpdateDraft(UUID userId, UUID sourcePassportId) {
    Passport source = passportRepo.findByIdAndUserId(sourcePassportId, userId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));

    return passportRepo
        .findFirstByUserIdAndSupersedesPassportIdAndStatusOrderByCreatedAtDesc(
            userId, sourcePassportId, "IN_PROGRESS"
        )
        .map(existing -> new Dto.InitResponse(existing.getId(), existing.getStatus()))
        .orElseGet(() -> {
          Dto.InitRequest request = new Dto.InitRequest();
          request.purpose = source.getPurpose();
          request.originCountry = source.getOriginCountry();
          request.destCountry = source.getDestCountry();
          request.fullName = source.getFullName();
          request.dob = source.getDob();
          request.supersedesPassportId = source.getId();
          return init(userId, request);
        });
  }

  @Transactional
  public Dto.PassportView updateDraft(UUID userId, UUID passportId, Dto.UpdateDraftRequest request) {
    Passport passport = passportRepo.findByIdAndUserId(passportId, userId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    if (!"IN_PROGRESS".equals(passport.getStatus()) && !"DRAFT".equals(passport.getStatus())) {
      throw new IllegalStateException("Published passports cannot be edited. Start an update first.");
    }
    boolean identityChanged = !sameIdentityName(
        passport.getIdentityVerifiedName(), request.fullName
    ) || !Objects.equals(passport.getIdentityVerifiedDob(), request.dob);
    passport.setPurpose(request.purpose);
    passport.setOriginCountry(request.originCountry);
    passport.setDestCountry(request.destCountry);
    passport.setFullName(request.fullName.trim());
    passport.setDob(request.dob);
    if (request.currentSection != null && !request.currentSection.isBlank()) {
      passport.setCurrentSection(validSection(request.currentSection));
    }
    if (identityChanged && identityWasCompleted(passport.getIdentityStatus())) {
      passport.setIdentityStatus("REQUIRES_REVERIFICATION");
      passport.setIdentityCompletedAt(null);
      passport.setIdentityVerifiedName(null);
      passport.setIdentityVerifiedDob(null);
    }
    passportRepo.saveAndFlush(passport);
    return view(userId, passport);
  }

  @Transactional
  public Dto.IdentitySubmissionResponse recordIdentitySubmission(UUID userId, UUID passportId) {
    Passport passport = passportRepo.findByIdAndUserId(passportId, userId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    if (!"IN_PROGRESS".equals(passport.getStatus()) && !"DRAFT".equals(passport.getStatus())) {
      throw new IllegalStateException("Start a passport update before submitting identity information.");
    }
    if (passport.getFullName() == null || passport.getFullName().isBlank() || passport.getDob() == null) {
      throw new IllegalStateException("Save the legal name and date of birth before identity verification.");
    }
    Instant completedAt = Instant.now();
    passport.setIdentityStatus("ENTRUST_SUBMITTED");
    passport.setIdentityCompletedAt(completedAt);
    passport.setIdentityVerifiedName(passport.getFullName());
    passport.setIdentityVerifiedDob(passport.getDob());
    passportRepo.saveAndFlush(passport);
    return new Dto.IdentitySubmissionResponse(passport.getIdentityStatus(), completedAt);
  }

  private boolean identityWasCompleted(String status) {
    return "ENTRUST_SUBMITTED".equals(status) || "PILOT_COMPLETED".equals(status);
  }

  private boolean sameIdentityName(String verified, String current) {
    if (verified == null || current == null) return false;
    return verified.trim().replaceAll("\\s+", " ")
        .equalsIgnoreCase(current.trim().replaceAll("\\s+", " "));
  }

  private String validSection(String section) {
    return switch (section.toUpperCase()) {
      case "PURPOSE", "IDENTITY", "FINANCIAL", "REVIEW", "OVERVIEW" -> section.toUpperCase();
      default -> throw new IllegalArgumentException("Unknown passport section");
    };
  }

  @Transactional
  public void cancelUpdate(UUID userId, UUID passportId) {
    Passport passport = passportRepo.findByIdAndUserId(passportId, userId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    if (!"IN_PROGRESS".equals(passport.getStatus()) && !"DRAFT".equals(passport.getStatus())) {
      throw new IllegalStateException("Only an unfinished update can be discarded");
    }
    passport.setStatus("CANCELLED");
    passportRepo.save(passport);
  }

  @Transactional(readOnly = true)
  public Dto.PassportView latest(UUID userId) {
    return passportRepo.findFirstByUserIdOrderByUpdatedAtDesc(userId)
        .map(passport -> view(userId, passport))
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
  }

  @Transactional(readOnly = true)
  public Dto.PassportView get(UUID userId, UUID passportId) {
    return passportRepo.findByIdAndUserId(passportId, userId)
        .map(passport -> view(userId, passport))
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
  }

  @Transactional(readOnly = true)
  public List<Dto.PassportView> history(UUID userId) {
    return passportRepo.findAllByUserIdOrderByUpdatedAtDesc(userId)
        .stream()
        .map(passport -> view(userId, passport))
        .toList();
  }

  private Dto.PassportView view(UUID userId, Passport passport) {
    UUID passportId = passport.getId();
    return new Dto.PassportView(
        passportId,
        passport.getStatus(),
        passport.getPurpose(),
        passport.getOriginCountry(),
        passport.getDestCountry(),
        passport.getFullName(),
        passport.getDob(),
        passport.getSupersedesPassportId(),
        passport.getIdentityStatus(),
        passport.getIdentityCompletedAt(),
        passport.getCurrentSection(),
        passportPlaidConnectionRepo.existsByBorrowerIdAndPassportIdAndActiveTrue(
            userId, passportId
        ),
        surepassReportRepo.existsByBorrowerIdAndPassportIdAndStatus(
            userId, passportId, "SUCCESS"
        ),
        passport.getCreatedAt(),
        passport.getUpdatedAt()
    );
  }

  @Transactional
  public void connectSources(UUID userId, UUID passportId, Dto.SourceConnectRequest req) {
    Passport p = passportRepo.findByIdAndUserId(passportId, userId)
      .orElseThrow(() -> new IllegalArgumentException("Passport not found"));

    for (String s : req.sources) {
      PassportSource ps = new PassportSource();
      ps.setPassportId(p.getId());
      ps.setSourceType(s);
      ps.setConnected(true);
      sourceRepo.save(ps);
    }
    p.setStatus("IN_PROGRESS");
    passportRepo.save(p);
  }

  @Transactional
  public void generate(UUID userId, UUID passportId) {
    Passport p = passportRepo.findByIdAndUserId(passportId, userId)
      .orElseThrow(() -> new IllegalArgumentException("Passport not found"));

    boolean hasPlaid = passportPlaidConnectionRepo
        .existsByBorrowerIdAndPassportIdAndActiveTrue(userId, passportId);
    boolean hasSurepass = surepassReportRepo.existsByBorrowerIdAndPassportIdAndStatus(
        userId, passportId, "SUCCESS"
    );
    if (!hasPlaid && !hasSurepass) {
      throw new IllegalStateException(
          "Connect at least one successful data source to this passport before generating it"
      );
    }
    if (!identityWasCompleted(p.getIdentityStatus())) {
      throw new IllegalStateException(
          "Complete identity verification before publishing this passport"
      );
    }

    plaidSnapshotService.createIfPlaidConnected(userId, passportId);
    p.setCurrentSection("OVERVIEW");
    p.setStatus("ACTIVE");
    passportRepo.save(p);
  }
}
