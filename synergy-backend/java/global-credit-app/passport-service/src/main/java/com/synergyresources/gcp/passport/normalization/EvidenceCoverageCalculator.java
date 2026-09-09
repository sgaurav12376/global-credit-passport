package com.synergyresources.gcp.passport.normalization;

import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class EvidenceCoverageCalculator {
  private static final Map<String, Integer> WEIGHTS = Map.of(
      "IDENTITY", 20, "CREDIT", 45, "CASHFLOW", 35
  );

  public EvidenceCoverage calculate(List<NormalizedEvidence> evidence) {
    Map<String, EvidenceCoverage.DomainCoverage> domains = new LinkedHashMap<>();
    List<String> missing = new ArrayList<>();
    int total = 0;
    for (String domain : List.of("IDENTITY", "CREDIT", "CASHFLOW")) {
      List<NormalizedEvidence> matches = evidence.stream()
          .filter(item -> domain.equals(item.getDomain())).toList();
      int bestQuality = matches.stream().mapToInt(NormalizedEvidence::getCompletenessPercent)
          .max().orElse(0);
      int contribution = Math.round(WEIGHTS.get(domain) * bestQuality / 100f);
      domains.put(domain, new EvidenceCoverage.DomainCoverage(
          !matches.isEmpty(), matches.size(), bestQuality, contribution
      ));
      total += contribution;
      if (matches.isEmpty()) missing.add(domain);
    }
    Set<String> providers = evidence.stream()
        .map(item -> item.getCountryCode() + ":" + item.getProvider())
        .collect(Collectors.toSet());
    boolean hasRiskEvidence = domains.get("CREDIT").available() || domains.get("CASHFLOW").available();
    return new EvidenceCoverage(
        "GCP_EVIDENCE_COVERAGE_V1", total, evidence.size(), providers.size(),
        Map.copyOf(domains), List.copyOf(missing), hasRiskEvidence && total >= 35
    );
  }
}
