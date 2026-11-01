package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.EntrustVerification;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EntrustVerificationRepo extends JpaRepository<EntrustVerification, UUID> {
  Optional<EntrustVerification> findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId
  );
}
