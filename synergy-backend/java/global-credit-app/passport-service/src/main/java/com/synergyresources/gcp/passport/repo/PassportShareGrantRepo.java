package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.PassportShareGrant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PassportShareGrantRepo extends JpaRepository<PassportShareGrant, UUID> {
  List<PassportShareGrant> findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId
  );
  Optional<PassportShareGrant> findByIdAndBorrowerId(UUID id, UUID borrowerId);
  Optional<PassportShareGrant> findByTokenHash(String tokenHash);
}
