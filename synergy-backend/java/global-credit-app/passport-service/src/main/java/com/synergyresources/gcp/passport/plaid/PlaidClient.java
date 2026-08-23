package com.synergyresources.gcp.passport.plaid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class PlaidClient {
  private static final int TRANSACTION_PAGE_SIZE = 500;
  private static final int MAX_TRANSACTION_PAGES = 100;

  private final RestClient restClient;
  private final ObjectMapper objectMapper;

  public PlaidClient(RestClient plaidRestClient, ObjectMapper objectMapper) {
    this.restClient = plaidRestClient;
    this.objectMapper = objectMapper;
  }

  public JsonNode createLinkToken(String clientUserId) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("client_name", "Global Credit Passport");
    body.put("language", "en");
    body.put("country_codes", List.of("US"));
    body.put("products", List.of("transactions", "identity"));
    body.put("user", Map.of("client_user_id", clientUserId));
    body.put("transactions", Map.of("days_requested", 180));
    return post("/link/token/create", body);
  }

  public TokenExchange exchangePublicToken(String publicToken) {
    JsonNode response = post(
        "/item/public_token/exchange",
        Map.of("public_token", publicToken)
    );
    return new TokenExchange(
        response.path("access_token").asText(),
        response.path("item_id").asText()
    );
  }

  public JsonNode getIdentity(String accessToken) {
    return post("/identity/get", Map.of("access_token", accessToken));
  }

  public void removeItem(String accessToken) {
    post("/item/remove", Map.of("access_token", accessToken));
  }

  public TransactionSyncResult syncAllTransactions(String accessToken) {
    return syncAllTransactions(accessToken, null);
  }

  public TransactionSyncResult syncAllTransactions(String accessToken, String startingCursor) {
    ArrayNode added = objectMapper.createArrayNode();
    ArrayNode modified = objectMapper.createArrayNode();
    ArrayNode removed = objectMapper.createArrayNode();

    String cursor = startingCursor;
    boolean hasMore;
    int pages = 0;

    do {
      if (++pages > MAX_TRANSACTION_PAGES) {
        throw new IllegalStateException("Plaid transaction pagination exceeded safety limit");
      }

      Map<String, Object> body = new LinkedHashMap<>();
      body.put("access_token", accessToken);
      body.put("count", TRANSACTION_PAGE_SIZE);
      if (cursor != null && !cursor.isBlank()) {
        body.put("cursor", cursor);
      }

      JsonNode page = post("/transactions/sync", body);
      append(added, page.path("added"));
      append(modified, page.path("modified"));
      append(removed, page.path("removed"));

      cursor = page.path("next_cursor").asText("");
      hasMore = page.path("has_more").asBoolean(false);
    } while (hasMore);

    return new TransactionSyncResult(added, modified, removed, cursor, pages);
  }

  private JsonNode post(String path, Object body) {
    JsonNode response = restClient.post()
        .uri(path)
        .body(body)
        .retrieve()
        .onStatus(status -> status.isError(), (request, httpResponse) -> {
          JsonNode error = objectMapper.readTree(httpResponse.getBody());
          throw new PlaidApiException(error);
        })
        .body(JsonNode.class);

    if (response == null) {
      throw new IllegalStateException("Plaid returned an empty response");
    }
    return response;
  }

  private void append(ArrayNode destination, JsonNode source) {
    if (source.isArray()) {
      source.forEach(destination::add);
    }
  }

  public record TokenExchange(String accessToken, String itemId) {
  }

  public record TransactionSyncResult(
      ArrayNode added,
      ArrayNode modified,
      ArrayNode removed,
      String nextCursor,
      int pages
  ) {
  }
}
