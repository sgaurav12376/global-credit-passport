package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.ReviewDocumentRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewDocumentRequestRepo extends JpaRepository<ReviewDocumentRequest, UUID> {
  List<ReviewDocumentRequest> findByShareGrantIdOrderByCreatedAtAsc(UUID shareGrantId);
  Optional<ReviewDocumentRequest> findByIdAndShareGrantId(UUID id, UUID shareGrantId);
}
