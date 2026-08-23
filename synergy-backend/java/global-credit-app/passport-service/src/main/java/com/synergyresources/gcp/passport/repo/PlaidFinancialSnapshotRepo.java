package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.PlaidFinancialSnapshot;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaidFinancialSnapshotRepo
    extends JpaRepository<PlaidFinancialSnapshot, UUID> {
  Optional<PlaidFinancialSnapshot> findByIdAndBorrowerId(UUID id, UUID borrowerId);

  List<PlaidFinancialSnapshot> findAllByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId,
      UUID passportId
  );
}
