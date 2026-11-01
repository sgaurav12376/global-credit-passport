package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.PassportOutput;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PassportOutputRepo extends JpaRepository<PassportOutput, UUID> {
  Optional<PassportOutput> findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId
  );
  Optional<PassportOutput> findByIdAndBorrowerIdAndPassportId(
      UUID id, UUID borrowerId, UUID passportId
  );
}
