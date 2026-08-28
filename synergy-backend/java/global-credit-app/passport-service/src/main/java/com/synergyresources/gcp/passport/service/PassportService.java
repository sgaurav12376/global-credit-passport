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

    plaidSnapshotService.createIfPlaidConnected(userId, passportId);
    p.setStatus("ACTIVE");
    passportRepo.save(p);
  }
}
