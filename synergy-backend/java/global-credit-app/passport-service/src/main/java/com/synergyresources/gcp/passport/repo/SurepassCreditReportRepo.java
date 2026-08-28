package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurepassCreditReportRepo extends JpaRepository<SurepassCreditReport, UUID> {
  Optional<SurepassCreditReport> findByIdAndBorrowerId(UUID id, UUID borrowerId);
  Optional<SurepassCreditReport> findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId
  );
  Optional<SurepassCreditReport> findFirstByBorrowerIdAndPassportIdAndStatusOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId, String status
  );
  List<SurepassCreditReport> findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
      UUID borrowerId, UUID passportId
  );
  boolean existsByBorrowerIdAndPassportIdAndStatus(
      UUID borrowerId, UUID passportId, String status
  );
}
