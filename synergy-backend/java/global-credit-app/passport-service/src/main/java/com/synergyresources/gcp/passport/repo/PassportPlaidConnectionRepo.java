package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.PassportPlaidConnection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PassportPlaidConnectionRepo
    extends JpaRepository<PassportPlaidConnection, Long> {
  Optional<PassportPlaidConnection> findByBorrowerIdAndPassportIdAndPlaidConnectionId(
      UUID borrowerId, UUID passportId, UUID plaidConnectionId
  );
  List<PassportPlaidConnection> findAllByBorrowerIdAndPassportIdAndActiveTrue(
      UUID borrowerId, UUID passportId
  );
  boolean existsByBorrowerIdAndPassportIdAndActiveTrue(UUID borrowerId, UUID passportId);
}
