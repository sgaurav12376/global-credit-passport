package com.synergyresources.gcp.passport.repo;

import com.synergyresources.gcp.passport.model.PassportSource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PassportSourceRepo extends JpaRepository<PassportSource, UUID> {
  List<PassportSource> findByPassportId(UUID passportId);
}
