package com.synergyresources.gcp.passport.entrust;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.config.EntrustProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class EntrustClient {
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final EntrustProperties properties;

  public EntrustClient(
      HttpClient entrustHttpClient,
      ObjectMapper objectMapper,
      EntrustProperties properties
  ) {
    this.httpClient = entrustHttpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public String createApplicant(String firstName, String lastName, String country) {
    JsonNode response = send("POST", "/v3.6/applicants", Map.of(
        "first_name", firstName,
        "last_name", lastName,
        "location", Map.of("country_of_residence", country)
    ));
    return required(response, "id", "Entrust did not return an applicant ID");
  }

  public WorkflowRun createWorkflowRun(String applicantId) {
    JsonNode response = send("POST", "/v3.6/workflow_runs", Map.of(
        "workflow_id", properties.workflowId(),
        "applicant_id", applicantId
    ));
    String runId = required(response, "id", "Entrust did not return a workflow run ID");
    String status = response.path("status").asText("awaiting_input");
    String captureUrl = response.path("link").path("url").asText(null);
    if (captureUrl == null || captureUrl.isBlank()) {
      throw new EntrustApiException("Entrust did not return a Smart Capture URL", 502);
    }
    return new WorkflowRun(runId, status, captureUrl, errorMessage(response));
  }

  public WorkflowRun getWorkflowRun(String workflowRunId) {
    JsonNode response = send("GET", "/v3.6/workflow_runs/" + workflowRunId, null);
    return new WorkflowRun(
        workflowRunId,
        response.path("status").asText("unknown"),
        response.path("link").path("url").asText(null),
        errorMessage(response)
    );
  }

  private JsonNode send(String method, String path, Object body) {
    if (!properties.enabled()) {
      throw new IllegalStateException("Entrust integration is disabled");
    }
    if (blank(properties.apiToken()) || blank(properties.workflowId()) || blank(properties.baseUrl())) {
      throw new IllegalStateException("Entrust configuration is incomplete");
    }
    try {
      HttpRequest.Builder builder = HttpRequest.newBuilder()
          .uri(URI.create(properties.baseUrl().replaceAll("/+$", "") + path))
          .timeout(Duration.ofSeconds(60))
          .header("Authorization", "Token token=" + properties.apiToken())
          .header("Accept", "application/json");
      if (body == null) {
        builder.GET();
      } else {
        builder.header("Content-Type", "application/json")
            .method(method, HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
      }
      HttpResponse<String> response = httpClient.send(
          builder.build(), HttpResponse.BodyHandlers.ofString()
      );
      JsonNode json = response.body() == null || response.body().isBlank()
          ? objectMapper.createObjectNode()
          : objectMapper.readTree(response.body());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new EntrustApiException(
            "Entrust request failed (" + response.statusCode() + "): " + providerMessage(json),
            response.statusCode()
        );
      }
      return json;
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new EntrustApiException("Entrust request was interrupted", 502);
    } catch (IOException | IllegalArgumentException exception) {
      throw new EntrustApiException("Unable to communicate with Entrust", 502);
    }
  }

  private String required(JsonNode response, String field, String message) {
    String value = response.path(field).asText(null);
    if (value == null || value.isBlank()) throw new EntrustApiException(message, 502);
    return value;
  }

  private String providerMessage(JsonNode response) {
    String value = response.path("error").path("message").asText(null);
    return value == null ? "provider error" : value;
  }

  private String errorMessage(JsonNode response) {
    String value = response.path("error").path("message").asText(null);
    return value == null || value.isBlank() ? null : value;
  }

  private boolean blank(String value) { return value == null || value.isBlank(); }

  public record WorkflowRun(String id, String status, String captureUrl, String error) {
  }
}
