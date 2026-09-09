package com.synergyresources.gcp.passport.normalization;

import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CreditNormalizationAdapter
    implements NormalizationAdapter<NormalizedCreditReport, GcpNormalized.CreditDataset> {
  public static final String SCHEMA_VERSION = "GCP_CREDIT_V1";

  public String adapterId() { return "gcp-credit-common"; }
  public String adapterVersion() { return "1.0.0"; }

  public GcpNormalized.CreditDataset normalize(
      NormalizedCreditReport source, NormalizationContext context
  ) {
    List<String> fields = new ArrayList<>();
    if (source.creditScore() != null) fields.add("nativeScore");
    if (source.summary() != null) fields.add("summary");
    if (source.tradelines() != null && !source.tradelines().isEmpty()) fields.add("accounts");
    if (source.scoreFactors() != null && !source.scoreFactors().isEmpty()) fields.add("scoreFactors");
    int completeness = fields.size() * 25;
    return new GcpNormalized.CreditDataset(
        SCHEMA_VERSION,
        provenance(context),
        new GcpNormalized.NativeScore(
            source.creditScore(), source.scoreMinimum(), source.scoreMaximum(), source.bureau()
        ),
        source.summary(),
        source.tradelines() == null ? List.of() : List.copyOf(source.tradelines()),
        source.scoreFactors() == null ? List.of() : List.copyOf(source.scoreFactors()),
        new GcpNormalized.DataQuality(
            completeness, List.copyOf(fields),
            source.dataQualityWarnings() == null ? List.of() : source.dataQualityWarnings()
        )
    );
  }

  private GcpNormalized.Provenance provenance(NormalizationContext value) {
    return new GcpNormalized.Provenance(
        value.countryCode(), value.provider(), value.sourceSystem(),
        value.providerReference(), value.consentVersion(), value.consentedAt(),
        value.retrievedAt(), value.documentSha256(), adapterId(), adapterVersion()
    );
  }
}
