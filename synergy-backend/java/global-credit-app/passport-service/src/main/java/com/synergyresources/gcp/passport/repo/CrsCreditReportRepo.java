package com.synergyresources.gcp.passport.repo;
import com.synergyresources.gcp.passport.model.CrsCreditReport;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CrsCreditReportRepo extends JpaRepository<CrsCreditReport, UUID> {
  Optional<CrsCreditReport> findFirstByBorrowerIdAndPassportIdAndStatusOrderByCreatedAtDesc(UUID borrowerId, UUID passportId, String status);
  List<CrsCreditReport> findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(UUID borrowerId, UUID passportId);
}
