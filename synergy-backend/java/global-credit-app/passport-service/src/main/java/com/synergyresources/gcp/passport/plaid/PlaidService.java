package com.synergyresources.gcp.passport.plaid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.synergyresources.gcp.passport.model.PlaidConnection;
import com.synergyresources.gcp.passport.repo.PlaidConnectionRepo;
import java.util.UUID;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaidService {
  private final PlaidClient plaidClient;
  private final PlaidConnectionRepo connectionRepo;
  private final PlaidTokenCipher tokenCipher;
  private final ObjectMapper objectMapper;
  private final PlaidDataNormalizer dataNormalizer;

  public PlaidService(
      PlaidClient plaidClient,
      PlaidConnectionRepo connectionRepo,
      PlaidTokenCipher tokenCipher,
      ObjectMapper objectMapper,
      PlaidDataNormalizer dataNormalizer
  ) {
    this.plaidClient = plaidClient;
    this.connectionRepo = connectionRepo;
    this.tokenCipher = tokenCipher;
    this.objectMapper = objectMapper;
    this.dataNormalizer = dataNormalizer;
  }

  public LinkTokenResponse createLinkToken(UUID borrowerId) {
    JsonNode response = plaidClient.createLinkToken(borrowerId.toString());
    return new LinkTokenResponse(
        response.path("link_token").asText(),
        response.path("expiration").asText()
    );
  }

  @Transactional
  public ConnectionResult connectAndFetch(UUID borrowerId, UUID passportId, String publicToken) {
    PlaidClient.TokenExchange exchange = plaidClient.exchangePublicToken(publicToken);
    JsonNode identity = plaidClient.getIdentity(exchange.accessToken());
    DuplicateConnection duplicate = findDuplicateConnection(borrowerId, identity);
    if (duplicate != null) {
      plaidClient.removeItem(exchange.accessToken());
      throw new PlaidDuplicateConnectionException(
          duplicate.institutionName(),
          duplicate.itemId()
      );
    }
    PlaidClient.TransactionSyncResult transactions =
        plaidClient.syncAllTransactions(exchange.accessToken());

    PlaidConnection connection = new PlaidConnection();
    connection.setBorrowerId(borrowerId);
    connection.setPassportId(passportId);
    connection.setItemId(exchange.itemId());
    connection.setEncryptedAccessToken(tokenCipher.encrypt(exchange.accessToken()));
    connection.setTransactionsCursor(transactions.nextCursor());
    connection.setIdentityAccounts(identity);
    connection.setAddedTransactions(transactions.added());
    connection.setModifiedTransactions(transactions.modified());
    connection.setRemovedTransactions(transactions.removed());
    connection.setStatus("CONNECTED");
    connectionRepo.save(connection);
    connectionRepo.flush();
    dataNormalizer.normalizeAccounts(exchange.itemId(), borrowerId, identity);
    dataNormalizer.reconcileTransactions(
        exchange.itemId(),
        borrowerId,
        transactions.added(),
        transactions.modified(),
        transactions.removed()
    );

    return toResult(connection, transactions.pages());
  }

  @Transactional
  public ConnectionResult refreshTransactions(UUID borrowerId, String itemId) {
    PlaidConnection connection = connectionRepo.findByBorrowerIdAndItemId(borrowerId, itemId)
        .orElseThrow(() -> new IllegalArgumentException("Plaid connection not found"));

    String accessToken = tokenCipher.decrypt(connection.getEncryptedAccessToken());
    PlaidClient.TransactionSyncResult transactions = plaidClient.syncAllTransactions(
        accessToken,
        connection.getTransactionsCursor()
    );

    connection.setAddedTransactions(append(
        connection.getAddedTransactions(),
        transactions.added()
    ));
    connection.setModifiedTransactions(append(
        connection.getModifiedTransactions(),
        transactions.modified()
    ));
    connection.setRemovedTransactions(append(
        connection.getRemovedTransactions(),
        transactions.removed()
    ));
    connection.setTransactionsCursor(transactions.nextCursor());
    connection.setStatus("CONNECTED");
    connectionRepo.save(connection);
    dataNormalizer.normalizeAccounts(
        connection.getItemId(),
        connection.getBorrowerId(),
        connection.getIdentityAccounts()
    );
    dataNormalizer.reconcileTransactions(
        connection.getItemId(),
        connection.getBorrowerId(),
        connection.getAddedTransactions(),
        connection.getModifiedTransactions(),
        connection.getRemovedTransactions()
    );

    return toResult(connection, transactions.pages());
  }

  @Transactional(readOnly = true)
  public ConnectionResult latestConnection(UUID borrowerId) {
    PlaidConnection connection = connectionRepo
        .findFirstByBorrowerIdOrderByCreatedAtDesc(borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Plaid connection not found"));
    return toResult(connection, 0);
  }

  @Transactional(readOnly = true)
  public List<ConnectionResult> connections(UUID borrowerId) {
    return connectionRepo.findAllByBorrowerIdOrderByCreatedAtDesc(borrowerId)
        .stream()
        .map(connection -> toResult(connection, 0))
        .toList();
  }

  @Transactional
  public void removeConnection(UUID borrowerId, String itemId) {
    PlaidConnection connection = connectionRepo.findByBorrowerIdAndItemId(borrowerId, itemId)
        .orElseThrow(() -> new IllegalArgumentException("Plaid connection not found"));
    plaidClient.removeItem(tokenCipher.decrypt(connection.getEncryptedAccessToken()));
    connectionRepo.delete(connection);
  }

  private ArrayNode append(JsonNode existing, JsonNode updates) {
    ArrayNode combined = objectMapper.createArrayNode();
    if (existing != null && existing.isArray()) existing.forEach(combined::add);
    if (updates != null && updates.isArray()) updates.forEach(combined::add);
    return combined;
  }

  private DuplicateConnection findDuplicateConnection(UUID borrowerId, JsonNode candidate) {
    String candidateInstitutionId = candidate.path("item").path("institution_id").asText("");
    Set<String> candidateAccounts = accountFingerprints(candidate.path("accounts"));
    if (candidateInstitutionId.isBlank() || candidateAccounts.isEmpty()) return null;

    for (PlaidConnection existing :
        connectionRepo.findAllByBorrowerIdOrderByCreatedAtDesc(borrowerId)) {
      JsonNode existingData = existing.getIdentityAccounts();
      String existingInstitutionId = existingData.path("item").path("institution_id").asText("");
      if (!candidateInstitutionId.equals(existingInstitutionId)) continue;

      Set<String> overlap = accountFingerprints(existingData.path("accounts"));
      overlap.retainAll(candidateAccounts);
      if (!overlap.isEmpty()) {
        String institutionName = candidate.path("item").path("institution_name")
            .asText("This institution");
        return new DuplicateConnection(institutionName, existing.getItemId());
      }
    }
    return null;
  }

  private Set<String> accountFingerprints(JsonNode accounts) {
    Set<String> fingerprints = new HashSet<>();
    if (!accounts.isArray()) return fingerprints;
    accounts.forEach(account -> {
      String mask = account.path("mask").asText("").trim();
      if (mask.isBlank()) return;
      fingerprints.add(String.join("|",
          mask,
          account.path("type").asText("").trim().toLowerCase(),
          account.path("subtype").asText("").trim().toLowerCase(),
          account.path("official_name").asText(
              account.path("name").asText("")
          ).trim().toLowerCase()
      ));
    });
    return fingerprints;
  }

  private record DuplicateConnection(String institutionName, String itemId) {
  }

  private ConnectionResult toResult(PlaidConnection connection, int pages) {
    return new ConnectionResult(
        connection.getBorrowerId(),
        connection.getPassportId(),
        connection.getItemId(),
        connection.getIdentityAccounts(),
        connection.getAddedTransactions(),
        connection.getModifiedTransactions(),
        connection.getRemovedTransactions(),
        connection.getTransactionsCursor(),
        pages,
        connection.getStatus(),
        connection.getCreatedAt()
    );
  }

  public record LinkTokenResponse(String linkToken, String expiration) {
  }

  public record ConnectionResult(
      UUID borrowerId,
      UUID passportId,
      String itemId,
      JsonNode identityAndAccounts,
      JsonNode addedTransactions,
      JsonNode modifiedTransactions,
      JsonNode removedTransactions,
      String nextCursor,
      int transactionPages,
      String status,
      java.time.Instant createdAt
  ) {
  }
}
