package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.springframework.stereotype.Component;

@Component
public class SurepassMultiBureauNormalizer {
  private final IndianCreditNormalizer normalizer;

  public SurepassMultiBureauNormalizer(IndianCreditNormalizer normalizer) {
    this.normalizer = normalizer;
  }

  public List<NormalizedCreditReport> normalizeAvailable(JsonNode response) {
    return normalizeBatch(response).reports();
  }

  public MultiBureauBatch normalizeBatch(JsonNode response) {
    JsonNode envelope = response.path("data").isObject() ? response.path("data") : response;
    JsonNode results = envelope.path("results");
    List<NormalizedCreditReport> reports = new ArrayList<>();
    List<BureauOutcome> outcomes = new ArrayList<>();
    addResult(results, "equifax", normalizer::normalizeEquifax, reports, outcomes);
    addResult(results, "experian", normalizer::normalizeExperian, reports, outcomes);
    addResult(results, "crif", normalizer::normalizeCrif, reports, outcomes);
    addResult(results, "cibil", normalizer::normalizeCibil, reports, outcomes);
    return new MultiBureauBatch(
        text(envelope, "doc_id"), List.copyOf(reports), List.copyOf(outcomes)
    );
  }

  private void addResult(
      JsonNode results,
      String bureau,
      Function<JsonNode, NormalizedCreditReport> parser,
      List<NormalizedCreditReport> reports,
      List<BureauOutcome> outcomes
  ) {
    JsonNode result = results.path(bureau);
    if (result.isMissingNode()) {
      outcomes.add(new BureauOutcome(bureau.toUpperCase(), false, null, "Not requested", false));
      return;
    }
    if (!result.path("success").asBoolean(false)) {
      outcomes.add(new BureauOutcome(
          bureau.toUpperCase(), false, nullableInteger(result, "status_code"),
          text(result, "message"), false
      ));
      return;
    }
    if (!result.path("data").isObject()) {
      outcomes.add(new BureauOutcome(
          bureau.toUpperCase(), false, nullableInteger(result, "status_code"),
          "Successful bureau result did not contain structured data", false
      ));
      return;
    }
    try {
      reports.add(parser.apply(result));
      outcomes.add(new BureauOutcome(
          bureau.toUpperCase(), true, nullableInteger(result, "status_code"),
          text(result, "message"), true
      ));
    } catch (RuntimeException exception) {
      outcomes.add(new BureauOutcome(
          bureau.toUpperCase(), false, nullableInteger(result, "status_code"),
          "Bureau report could not be normalized: " + exception.getMessage(), false
      ));
    }
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    if (value.isMissingNode() || value.isNull()) return null;
    String text = value.asText();
    return text.isBlank() ? null : text;
  }

  private Integer nullableInteger(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isIntegralNumber() ? value.asInt() : null;
  }

  public record MultiBureauBatch(
      String providerReference,
      List<NormalizedCreditReport> reports,
      List<BureauOutcome> outcomes
  ) {
  }

  public record BureauOutcome(
      String bureau,
      boolean providerSuccess,
      Integer providerStatusCode,
      String providerMessage,
      boolean normalized
  ) {
  }
}
