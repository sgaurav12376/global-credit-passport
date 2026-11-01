package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.ReviewDocumentSubmission;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewDocumentSubmissionRepo extends JpaRepository<ReviewDocumentSubmission, UUID> {
  Optional<ReviewDocumentSubmission> findFirstByRequestIdAndSupersededAtIsNullOrderByUploadedAtDesc(
      UUID requestId
  );
}
