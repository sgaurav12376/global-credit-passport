package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.PlaidConnection;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaidConnectionRepo extends JpaRepository<PlaidConnection, UUID> {
  Optional<PlaidConnection> findByBorrowerIdAndItemId(UUID borrowerId, String itemId);
  Optional<PlaidConnection> findFirstByBorrowerIdOrderByCreatedAtDesc(UUID borrowerId);
  List<PlaidConnection> findAllByBorrowerIdOrderByCreatedAtDesc(UUID borrowerId);
}
