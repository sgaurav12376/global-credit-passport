package com.synergyresources.gcp.passport.entrust;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.synergyresources.gcp.passport.config.EntrustProperties;
import com.synergyresources.gcp.passport.model.EntrustVerification;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.repo.EntrustVerificationRepo;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class EntrustVerificationServiceTest {
  @Test
  void startsAUniqueWorkflowAndPersistsProviderIdentifiers() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    Passport passport = new Passport();
    passport.setUserId(borrowerId);
    passport.setFullName("Vishal Rathore");
    passport.setDob(LocalDate.of(1999, 8, 2));
    passport.setOriginCountry("IN");
    passport.setResidenceCountry("IN");
    passport.setStatus("IN_PROGRESS");

    EntrustClient client = mock(EntrustClient.class);
    EntrustVerificationRepo verificationRepo = mock(EntrustVerificationRepo.class);
    PassportRepo passportRepo = mock(PassportRepo.class);
    EntrustProperties properties = new EntrustProperties(
        true, "https://api.us.onfido.com", "test-token", "workflow-1"
    );
    when(passportRepo.findByIdAndUserId(passportId, borrowerId))
        .thenReturn(Optional.of(passport));
    when(verificationRepo.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
        borrowerId, passportId
    )).thenReturn(Optional.empty());
    when(client.createApplicant("Vishal", "Rathore", "IND")).thenReturn("applicant-1");
    when(client.createWorkflowRun("applicant-1")).thenReturn(
        new EntrustClient.WorkflowRun(
            "run-1", "awaiting_input", "https://us.onfido.app/l/run-1", null
        )
    );

    EntrustVerificationService service = new EntrustVerificationService(
        client, properties, verificationRepo, passportRepo
    );
    var result = service.start(borrowerId, passportId);

    assertEquals("run-1", result.workflowRunId());
    assertEquals("AWAITING_INPUT", result.status());
    assertEquals("ENTRUST_AWAITING_INPUT", passport.getIdentityStatus());
    ArgumentCaptor<EntrustVerification> saved = ArgumentCaptor.forClass(EntrustVerification.class);
    verify(verificationRepo).save(saved.capture());
    assertEquals("applicant-1", saved.getValue().getApplicantId());
    assertEquals("workflow-1", saved.getValue().getWorkflowId());
  }
}
