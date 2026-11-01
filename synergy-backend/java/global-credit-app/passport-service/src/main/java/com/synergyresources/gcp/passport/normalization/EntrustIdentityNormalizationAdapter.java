package com.synergyresources.gcp.passport.normalization;

import com.synergyresources.gcp.passport.model.EntrustVerification;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EntrustIdentityNormalizationAdapter
    implements NormalizationAdapter<EntrustVerification, GcpNormalized.IdentityDataset> {
  public String adapterId() { return "entrust-identity"; }
  public String adapterVersion() { return "1.0.0"; }

  public GcpNormalized.IdentityDataset normalize(
      EntrustVerification source, NormalizationContext context
  ) {
    boolean approved = "APPROVED".equals(source.getStatus());
    return new GcpNormalized.IdentityDataset(
        "GCP_IDENTITY_V1",
        new GcpNormalized.Provenance(
            context.countryCode(), context.provider(), context.sourceSystem(),
            context.providerReference(), context.consentVersion(), context.consentedAt(),
            context.retrievedAt(), context.documentSha256(), adapterId(), adapterVersion()
        ),
        source.getStatus(), approved, source.getWorkflowRunId(),
        source.getStartedAt(), source.getCompletedAt(),
        new GcpNormalized.DataQuality(
            source.getStatus() == null ? 50 : 100,
            source.getStatus() == null ? List.of("workflowReference")
                : List.of("workflowReference", "status"),
            source.getProviderError() == null ? List.of() : List.of("Provider reported an error")
        )
    );
  }
}
