package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.Passport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface PassportRepo extends JpaRepository<Passport, UUID> {
  Optional<Passport> findByIdAndUserId(UUID id, UUID userId);
  Optional<Passport> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);
  Optional<Passport> findFirstByUserIdAndSupersedesPassportIdAndStatusOrderByCreatedAtDesc(
      UUID userId, UUID supersedesPassportId, String status
  );
  List<Passport> findAllByUserIdOrderByUpdatedAtDesc(UUID userId);
}
