package com.synergyresources.gcp.passport.service;

import com.synergyresources.gcp.passport.api.Dto;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PassportSource;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PassportSourceRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class PassportService {
  private final PassportRepo passportRepo;
  private final PassportSourceRepo sourceRepo;

  public PassportService(PassportRepo passportRepo, PassportSourceRepo sourceRepo) {
    this.passportRepo = passportRepo;
    this.sourceRepo = sourceRepo;
  }

  @Transactional
  public Dto.InitResponse init(UUID userId, Dto.InitRequest req) {
    Passport p = new Passport();
    p.setUserId(userId);
    p.setPurpose(req.purpose);
    p.setOriginCountry(req.originCountry);
    p.setDestCountry(req.destCountry);
    p.setFullName(req.fullName);
    p.setDob(req.dob);
    p.setStatus("IN_PROGRESS");
    passportRepo.save(p);
    return new Dto.InitResponse(p.getId(), p.getStatus());
  }

  @Transactional
  public void connectSources(UUID userId, UUID passportId, Dto.SourceConnectRequest req) {
    Passport p = passportRepo.findByIdAndUserId(passportId, userId)
      .orElseThrow(() -> new IllegalArgumentException("Passport not found"));

    for (String s : req.sources) {
      PassportSource ps = new PassportSource();
      ps.setPassportId(p.getId());
      ps.setSourceType(s);
      ps.setConnected(true);
      sourceRepo.save(ps);
    }
    p.setStatus("IN_PROGRESS");
    passportRepo.save(p);
  }

  @Transactional
  public void generate(UUID userId, UUID passportId) {
    Passport p = passportRepo.findByIdAndUserId(passportId, userId)
      .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    p.setStatus("ACTIVE");
    passportRepo.save(p);
  }
}
