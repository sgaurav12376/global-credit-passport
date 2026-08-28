package com.synergyresources.gcp.passport.plaid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.synergyresources.gcp.passport.model.PlaidConnection;
import com.synergyresources.gcp.passport.model.PassportPlaidConnection;
import com.synergyresources.gcp.passport.model.PlaidFinancialSnapshot;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PlaidConnectionRepo;
import com.synergyresources.gcp.passport.repo.PassportPlaidConnectionRepo;
import com.synergyresources.gcp.passport.repo.PlaidFinancialSnapshotRepo;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaidFinancialSnapshotService {
  public static final String METHODOLOGY_VERSION = "PLAID_CASHFLOW_V1";

  private final PlaidFinancialSummaryService summaryService;
  private final PlaidFinancialSnapshotRepo snapshotRepo;
  private final PlaidConnectionRepo connectionRepo;
  private final PassportRepo passportRepo;
  private final ObjectMapper objectMapper;
  private final PassportPlaidConnectionRepo passportConnectionRepo;

  public PlaidFinancialSnapshotService(
      PlaidFinancialSummaryService summaryService,
      PlaidFinancialSnapshotRepo snapshotRepo,
      PlaidConnectionRepo connectionRepo,
      PassportRepo passportRepo,
      ObjectMapper objectMapper,
      PassportPlaidConnectionRepo passportConnectionRepo
  ) {
    this.summaryService = summaryService;
    this.snapshotRepo = snapshotRepo;
    this.connectionRepo = connectionRepo;
    this.passportRepo = passportRepo;
    this.objectMapper = objectMapper;
    this.passportConnectionRepo = passportConnectionRepo;
  }

  @Transactional
  public SnapshotResult create(UUID borrowerId, UUID passportId) {
    passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));

    List<UUID> connectionIds = passportConnectionRepo
        .findAllByBorrowerIdAndPassportIdAndActiveTrue(borrowerId, passportId)
        .stream()
        .map(PassportPlaidConnection::getPlaidConnectionId)
        .toList();
    List<PlaidConnection> connections = connectionIds.isEmpty()
        ? List.of()
        : connectionRepo.findAllByBorrowerIdAndIdInOrderByCreatedAtDesc(
            borrowerId, connectionIds
        );
    if (connections.isEmpty()) {
      throw new IllegalArgumentException("No Plaid connection is attached to this passport");
    }

    PlaidFinancialSummaryService.FinancialSummary summary =
        summaryService.getSummary(
            borrowerId,
            connections.stream().map(PlaidConnection::getItemId).toList()
        );
    if (summary.analyzedTransactions() == 0) {
      throw new IllegalArgumentException("No eligible Plaid transactions are available to snapshot");
    }

    ArrayNode itemIds = objectMapper.createArrayNode();
    connections.stream()
        .map(PlaidConnection::getItemId)
        .distinct()
        .sorted()
        .forEach(itemIds::add);

    PlaidFinancialSnapshot snapshot = new PlaidFinancialSnapshot();
    snapshot.setBorrowerId(borrowerId);
    snapshot.setPassportId(passportId);
    snapshot.setMethodologyVersion(METHODOLOGY_VERSION);
    snapshot.setSummary(objectMapper.valueToTree(summary));
    snapshot.setSourceItemIds(itemIds);
    snapshotRepo.saveAndFlush(snapshot);
    return toResult(snapshot);
  }

  @Transactional
  public Optional<SnapshotResult> createIfPlaidConnected(UUID borrowerId, UUID passportId) {
    if (!passportConnectionRepo.existsByBorrowerIdAndPassportIdAndActiveTrue(
        borrowerId, passportId
    )) {
      return Optional.empty();
    }
    return Optional.of(create(borrowerId, passportId));
  }

  @Transactional(readOnly = true)
  public SnapshotResult get(UUID borrowerId, UUID snapshotId) {
    return snapshotRepo.findByIdAndBorrowerId(snapshotId, borrowerId)
        .map(this::toResult)
        .orElseThrow(() -> new IllegalArgumentException("Plaid financial snapshot not found"));
  }

  @Transactional(readOnly = true)
  public List<SnapshotResult> list(UUID borrowerId, UUID passportId) {
    passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    return snapshotRepo
        .findAllByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId)
        .stream()
        .map(this::toResult)
        .toList();
  }

  private SnapshotResult toResult(PlaidFinancialSnapshot snapshot) {
    return new SnapshotResult(
        snapshot.getId(),
        snapshot.getBorrowerId(),
        snapshot.getPassportId(),
        snapshot.getMethodologyVersion(),
        snapshot.getSummary(),
        snapshot.getSourceItemIds(),
        snapshot.getCreatedAt()
    );
  }

  public record SnapshotResult(
      UUID snapshotId,
      UUID borrowerId,
      UUID passportId,
      String methodologyVersion,
      JsonNode summary,
      JsonNode sourceItemIds,
      Instant createdAt
  ) {
  }
}
