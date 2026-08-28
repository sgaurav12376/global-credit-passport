package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.config.SurepassProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class SurepassClient {
  private final RestClient restClient;
  private final ObjectMapper objectMapper;
  private final SurepassProperties properties;

  public SurepassClient(
      @Qualifier("surepassRestClient") RestClient restClient,
      ObjectMapper objectMapper,
      SurepassProperties properties
  ) {
    this.restClient = restClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public JsonNode fetchCrifReport(CrifRequest request) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("first_name", request.firstName());
    body.put("last_name", request.lastName());
    body.put("mobile", request.mobile());
    body.put("pan", request.pan());
    body.put("consent", "Y");
    return post("/api/v1/credit-report-crif/fetch-report", body);
  }

  public JsonNode fetchExperianReport(ExperianRequest request) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("name", request.firstName() + " " + request.lastName());
    body.put("mobile", request.mobile());
    body.put("pan", request.pan());
    body.put("consent", "Y");
    return post("/api/v1/credit-report-experian/fetch-report", body);
  }

  public JsonNode fetchCibilPdfReport(CibilPdfRequest request) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("mobile", request.mobile());
    body.put("pan", request.pan());
    body.put("name", request.name());
    body.put("gender", request.gender());
    body.put("consent", "Y");
    return post("/api/v1/credit-report-cibil/fetch-report-pdf", body);
  }

  public JsonNode fetchCibilReport(CibilPdfRequest request) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("mobile", request.mobile());
    body.put("pan", request.pan());
    body.put("name", request.name());
    body.put("gender", request.gender());
    body.put("consent", "Y");
    return post("/api/v1/credit-report-cibil/fetch-report", body);
  }

  private JsonNode post(String path, Object body) {
    ensureEnabled();

    JsonNode response = restClient.post()
        .uri(path)
        .body(body)
        .retrieve()
        .onStatus(status -> status.isError(), (request, httpResponse) -> {
          JsonNode error = objectMapper.readTree(httpResponse.getBody());
          throw new SurepassApiException(httpResponse.getStatusCode().value(), error);
        })
        .body(JsonNode.class);

    if (response == null) {
      throw new IllegalStateException("Surepass returned an empty response");
    }
    if (!response.path("success").asBoolean(false)) {
      throw new SurepassApiException(response.path("status_code").asInt(502), response);
    }
    return response;
  }

  private void ensureEnabled() {
    if (!properties.enabled()) {
      throw new IllegalStateException("Surepass integration is disabled");
    }
    if (properties.bearerToken() == null || properties.bearerToken().isBlank()) {
      throw new IllegalStateException("Surepass bearer token is not configured");
    }
  }

  public record CrifRequest(
      String firstName,
      String lastName,
      String mobile,
      String pan
  ) {
  }

  public record ExperianRequest(
      String firstName,
      String lastName,
      String mobile,
      String pan
  ) {
  }

  public record CibilPdfRequest(
      String name,
      String mobile,
      String pan,
      String gender
  ) {
  }
}
