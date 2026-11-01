package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.config.FinpassProperties;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class FinpassMultiBureauClient {
  private final RestClient restClient;
  private final FinpassProperties properties;
  private final ObjectMapper objectMapper;

  public FinpassMultiBureauClient(
      @Qualifier("finpassRestClient") RestClient restClient,
      FinpassProperties properties,
      ObjectMapper objectMapper
  ) {
    this.restClient = restClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public JsonNode fetch(Request request) {
    ensureConfigured();
    JsonNode response = restClient.post()
        .uri("/api/v1/services/multi-bureau/fetch")
        .header("X-API-Key", properties.apiKey())
        .header("X-API-Secret", properties.apiSecret())
        .body(Map.of(
            "pan", request.pan(),
            "name", request.name(),
            "mobile_number", request.mobileNumber(),
            "consent", "Y",
            "gender", request.gender(),
            "bureaus", List.of("equifax", "experian", "cibil", "crif")
        ))
        .retrieve()
        .onStatus(status -> status.isError(), (httpRequest, httpResponse) -> {
          JsonNode error = objectMapper.readTree(httpResponse.getBody());
          throw new SurepassApiException(httpResponse.getStatusCode().value(), error);
        })
        .body(JsonNode.class);
    if (response == null) throw new IllegalStateException("Credit provider returned an empty response");
    if (!response.path("success").asBoolean(false)) {
      throw new SurepassApiException(response.path("status_code").asInt(502), response);
    }
    return response;
  }

  private void ensureConfigured() {
    if (!properties.enabled()) throw new IllegalStateException("Multi-bureau credit integration is disabled");
    if (properties.apiKey() == null || properties.apiKey().isBlank()
        || properties.apiSecret() == null || properties.apiSecret().isBlank()) {
      throw new IllegalStateException("Multi-bureau credit credentials are not configured");
    }
  }

  public record Request(String pan, String name, String mobileNumber, String gender) {
  }
}
