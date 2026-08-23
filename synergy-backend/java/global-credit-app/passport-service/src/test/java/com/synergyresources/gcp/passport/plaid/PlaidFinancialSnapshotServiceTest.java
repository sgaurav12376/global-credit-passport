package com.synergyresources.gcp.passport.plaid;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PlaidConnection;
import com.synergyresources.gcp.passport.model.PlaidFinancialSnapshot;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PlaidConnectionRepo;
import com.synergyresources.gcp.passport.repo.PlaidFinancialSnapshotRepo;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class PlaidFinancialSnapshotServiceTest {

  @Test
  void storesVersionedSummaryAndSourceItems() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    PlaidFinancialSummaryService summaryService = mock(PlaidFinancialSummaryService.class);
    PlaidFinancialSnapshotRepo snapshotRepo = mock(PlaidFinancialSnapshotRepo.class);
    PlaidConnectionRepo connectionRepo = mock(PlaidConnectionRepo.class);
    PassportRepo passportRepo = mock(PassportRepo.class);
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    PlaidFinancialSnapshotService service = new PlaidFinancialSnapshotService(
        summaryService,
        snapshotRepo,
        connectionRepo,
        passportRepo,
        objectMapper
    );

    Passport passport = mock(Passport.class);
    PlaidConnection first = mock(PlaidConnection.class);
    PlaidConnection second = mock(PlaidConnection.class);
    when(first.getItemId()).thenReturn("item-b");
    when(second.getItemId()).thenReturn("item-a");
    when(passportRepo.findByIdAndUserId(passportId, borrowerId))
        .thenReturn(Optional.of(passport));
    when(connectionRepo.findAllByBorrowerIdOrderByCreatedAtDesc(borrowerId))
        .thenReturn(List.of(first, second));
    when(summaryService.getSummary(borrowerId)).thenReturn(summary(borrowerId));
    when(snapshotRepo.saveAndFlush(any(PlaidFinancialSnapshot.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.create(borrowerId, passportId);

    ArgumentCaptor<PlaidFinancialSnapshot> captor =
        ArgumentCaptor.forClass(PlaidFinancialSnapshot.class);
    verify(snapshotRepo).saveAndFlush(captor.capture());
    PlaidFinancialSnapshot stored = captor.getValue();
    assertEquals(PlaidFinancialSnapshotService.METHODOLOGY_VERSION,
        stored.getMethodologyVersion());
    assertEquals("item-a", stored.getSourceItemIds().get(0).asText());
    assertEquals("item-b", stored.getSourceItemIds().get(1).asText());
    assertEquals(borrowerId.toString(), stored.getSummary().get("borrowerId").asText());
    assertEquals(30, stored.getSummary().get("analyzedTransactions").asInt());
  }

  @Test
  void rejectsSnapshotForPassportOwnedByAnotherBorrower() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    PassportRepo passportRepo = mock(PassportRepo.class);
    PlaidFinancialSnapshotService service = new PlaidFinancialSnapshotService(
        mock(PlaidFinancialSummaryService.class),
        mock(PlaidFinancialSnapshotRepo.class),
        mock(PlaidConnectionRepo.class),
        passportRepo,
        new ObjectMapper().findAndRegisterModules()
    );
    when(passportRepo.findByIdAndUserId(passportId, borrowerId))
        .thenReturn(Optional.empty());

    assertThrows(
        IllegalArgumentException.class,
        () -> service.create(borrowerId, passportId)
    );
  }

  private PlaidFinancialSummaryService.FinancialSummary summary(UUID borrowerId) {
    BigDecimal zero = BigDecimal.ZERO.setScale(2);
    return new PlaidFinancialSummaryService.FinancialSummary(
        borrowerId,
        2,
        4,
        30,
        LocalDate.of(2026, 3, 1),
        LocalDate.of(2026, 7, 31),
        5,
        5,
        0,
        zero,
        new BigDecimal("4.22"),
        new BigDecimal("500.00"),
        new BigDecimal("142.46"),
        new BigDecimal("25.00"),
        new BigDecimal("-138.24"),
        new BigDecimal("361.76"),
        null,
        List.of()
    );
  }
}
