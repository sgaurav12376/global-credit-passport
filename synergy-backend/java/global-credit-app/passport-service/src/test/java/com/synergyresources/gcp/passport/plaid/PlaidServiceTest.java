package com.synergyresources.gcp.passport.plaid;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.PlaidConnection;
import com.synergyresources.gcp.passport.repo.PlaidConnectionRepo;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PlaidServiceTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void rejectsAndRemovesNewItemWhenAnAccountIsAlreadyConnected() throws Exception {
    UUID borrowerId = UUID.randomUUID();
    PlaidClient client = mock(PlaidClient.class);
    PlaidConnectionRepo repo = mock(PlaidConnectionRepo.class);
    PlaidTokenCipher cipher = mock(PlaidTokenCipher.class);
    PlaidDataNormalizer normalizer = mock(PlaidDataNormalizer.class);
    PlaidService service = new PlaidService(client, repo, cipher, objectMapper, normalizer);

    JsonNode identity = identity("ins_1", "Test Bank", "0000", "checking");
    PlaidConnection existing = new PlaidConnection();
    existing.setItemId("existing-item");
    existing.setIdentityAccounts(identity);

    when(client.exchangePublicToken("public-token"))
        .thenReturn(new PlaidClient.TokenExchange("new-access-token", "new-item"));
    when(client.getIdentity("new-access-token")).thenReturn(identity);
    when(repo.findAllByBorrowerIdOrderByCreatedAtDesc(borrowerId))
        .thenReturn(List.of(existing));

    PlaidDuplicateConnectionException exception = assertThrows(
        PlaidDuplicateConnectionException.class,
        () -> service.connectAndFetch(borrowerId, null, "public-token")
    );

    assertEquals("existing-item", exception.existingItemId());
    verify(client).removeItem("new-access-token");
    verify(client, never()).syncAllTransactions("new-access-token");
    verify(repo, never()).save(org.mockito.ArgumentMatchers.any());
  }

  private JsonNode identity(
      String institutionId,
      String institutionName,
      String mask,
      String subtype
  ) throws Exception {
    return objectMapper.readTree("""
        {
          "item": {
            "institution_id": "%s",
            "institution_name": "%s"
          },
          "accounts": [{
            "mask": "%s",
            "type": "depository",
            "subtype": "%s",
            "name": "Plaid Checking",
            "official_name": "Plaid Gold Checking"
          }]
        }
        """.formatted(institutionId, institutionName, mask, subtype));
  }
}
