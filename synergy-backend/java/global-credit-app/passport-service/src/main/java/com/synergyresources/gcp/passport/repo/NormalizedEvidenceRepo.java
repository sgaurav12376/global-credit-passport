package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NormalizedEvidenceRepo extends JpaRepository<NormalizedEvidence, UUID> {
  List<NormalizedEvidence> findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId
  );
  Optional<NormalizedEvidence> findFirstByPassportIdAndDomainAndProviderAndSourceSystemAndProviderReferenceAndSchemaVersion(
      UUID passportId, String domain, String provider, String sourceSystem,
      String providerReference, String schemaVersion
  );
}
