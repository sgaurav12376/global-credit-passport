package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.LenderReviewEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LenderReviewEventRepo extends JpaRepository<LenderReviewEvent, UUID> {
  List<LenderReviewEvent> findByShareGrantIdOrderByCreatedAtAsc(UUID shareGrantId);
}
