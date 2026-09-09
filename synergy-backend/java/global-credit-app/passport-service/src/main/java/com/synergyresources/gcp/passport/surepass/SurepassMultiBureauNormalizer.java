package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SurepassMultiBureauNormalizer {
  private final IndianCreditNormalizer normalizer;

  public SurepassMultiBureauNormalizer(IndianCreditNormalizer normalizer) {
    this.normalizer = normalizer;
  }

  public List<NormalizedCreditReport> normalizeAvailable(JsonNode response) {
    JsonNode results = response.path("results");
    List<NormalizedCreditReport> reports = new ArrayList<>();
    addIfSuccessful(results, "equifax", normalizer::normalizeEquifax, reports);
    addIfSuccessful(results, "experian", normalizer::normalizeExperian, reports);
    addIfSuccessful(results, "crif", normalizer::normalizeCrif, reports);
    addIfSuccessful(results, "cibil", normalizer::normalizeCibil, reports);
    return List.copyOf(reports);
  }

  private void addIfSuccessful(
      JsonNode results,
      String bureau,
      java.util.function.Function<JsonNode, NormalizedCreditReport> parser,
      List<NormalizedCreditReport> reports
  ) {
    JsonNode result = results.path(bureau);
    if (result.path("success").asBoolean(false) && result.path("data").isObject()) {
      reports.add(parser.apply(result));
    }
  }
}
