package com.synergyresources.gcp.passport.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.synergyresources.gcp.passport.api.Dto;
import com.synergyresources.gcp.passport.model.EntrustVerification;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PassportOutput;
import com.synergyresources.gcp.passport.plaid.PlaidFinancialSnapshotService;
import com.synergyresources.gcp.passport.repo.EntrustVerificationRepo;
import com.synergyresources.gcp.passport.repo.PassportPlaidConnectionRepo;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PassportSourceRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PassportIdentityUpdateTest {
  @Test
  void changingIdentityDetailsSupersedesThePreviousEntrustRun() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    PassportRepo passportRepo = mock(PassportRepo.class);
    PassportPlaidConnectionRepo plaidConnectionRepo = mock(PassportPlaidConnectionRepo.class);
    SurepassCreditReportRepo surepassRepo = mock(SurepassCreditReportRepo.class);
    EntrustVerificationRepo entrustRepo = mock(EntrustVerificationRepo.class);
    Passport passport = new Passport();
    passport.setUserId(borrowerId);
    passport.setStatus("IN_PROGRESS");
    passport.setPurpose("LOAN");
    passport.setOriginCountry("IN");
    passport.setDestCountry("US");
    passport.setResidenceCountry("IN");
    passport.setFullName("Old Name");
    passport.setDob(LocalDate.of(1990, 1, 1));
    passport.setIdentityStatus("ENTRUST_DECLINED");
    EntrustVerification verification = new EntrustVerification();
    verification.setStatus("DECLINED");

    when(passportRepo.findByIdAndUserId(passportId, borrowerId))
        .thenReturn(Optional.of(passport));
    when(entrustRepo.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
        borrowerId, passportId)).thenReturn(Optional.of(verification));

    PassportService service = new PassportService(
        passportRepo,
        mock(PassportSourceRepo.class),
        mock(PlaidFinancialSnapshotService.class),
        plaidConnectionRepo,
        surepassRepo,
        mock(PassportOutputService.class),
        entrustRepo,
        true
    );
    Dto.UpdateDraftRequest request = new Dto.UpdateDraftRequest();
    request.purpose = "LOAN";
    request.originCountry = "IN";
    request.destCountry = "US";
    request.residenceCountry = "US";
    request.fullName = "New Name";
    request.dob = LocalDate.of(1991, 2, 2);

    service.updateDraft(borrowerId, passportId, request);

    assertEquals("SUPERSEDED", verification.getStatus());
    assertEquals("REQUIRES_REVERIFICATION", passport.getIdentityStatus());
    assertNull(passport.getIdentityCompletedAt());
    verify(entrustRepo).save(verification);
  }

  @Test
  void unchangedUpdateDraftCanPublishWithInheritedSandboxVerification() {
    UUID borrowerId = UUID.randomUUID();
    UUID draftId = UUID.randomUUID();
    UUID parentId = UUID.randomUUID();
    PassportRepo passportRepo = mock(PassportRepo.class);
    PassportPlaidConnectionRepo plaidConnectionRepo = mock(PassportPlaidConnectionRepo.class);
    SurepassCreditReportRepo surepassRepo = mock(SurepassCreditReportRepo.class);
    EntrustVerificationRepo entrustRepo = mock(EntrustVerificationRepo.class);
    PlaidFinancialSnapshotService snapshotService = mock(PlaidFinancialSnapshotService.class);
    PassportOutputService outputService = mock(PassportOutputService.class);
    Passport draft = passport(draftId, parentId);
    Passport parent = passport(parentId, null);
    EntrustVerification verification = new EntrustVerification();
    verification.setStatus("DECLINED");

    when(passportRepo.findByIdAndUserId(draftId, borrowerId)).thenReturn(Optional.of(draft));
    when(passportRepo.findByIdAndUserId(parentId, borrowerId)).thenReturn(Optional.of(parent));
    when(plaidConnectionRepo.existsByBorrowerIdAndPassportIdAndActiveTrue(borrowerId, draftId))
        .thenReturn(true);
    when(entrustRepo.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
        borrowerId, draftId)).thenReturn(Optional.empty());
    when(entrustRepo.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
        borrowerId, parentId)).thenReturn(Optional.of(verification));
    PassportOutput output = mock(PassportOutput.class);
    when(outputService.create(borrowerId, draft, true, verification)).thenReturn(output);

    PassportService service = new PassportService(
        passportRepo, mock(PassportSourceRepo.class), snapshotService,
        plaidConnectionRepo, surepassRepo, outputService, entrustRepo, true
    );

    service.generate(borrowerId, draftId);

    verify(outputService).create(borrowerId, draft, true, verification);
    verify(draft).setStatus("ACTIVE");
  }

  private Passport passport(UUID id, UUID supersedesId) {
    Passport passport = mock(Passport.class);
    when(passport.getId()).thenReturn(id);
    when(passport.getSupersedesPassportId()).thenReturn(supersedesId);
    when(passport.getFullName()).thenReturn("Same Person");
    when(passport.getDob()).thenReturn(LocalDate.of(1990, 1, 1));
    when(passport.getResidenceCountry()).thenReturn("US");
    when(passport.getIdentityStatus()).thenReturn("ENTRUST_DECLINED");
    return passport;
  }
}
