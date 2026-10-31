package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.LenderPassportInvitation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LenderPassportInvitationRepo
    extends JpaRepository<LenderPassportInvitation, UUID> {
  Optional<LenderPassportInvitation> findByTokenHash(String tokenHash);
}
