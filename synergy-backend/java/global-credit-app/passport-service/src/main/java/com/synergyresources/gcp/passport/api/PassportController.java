package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.api.Dto;
import com.synergyresources.gcp.passport.service.PassportService;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/v1/passports")
public class PassportController {
  private final PassportService service;
  public PassportController(PassportService service) { this.service = service; }

  private UUID currentUserId() {
    return CurrentBorrower.id();
  }

  @PostMapping("/init")
  public Dto.InitResponse init(@Valid @RequestBody Dto.InitRequest req) {
    return service.init(currentUserId(), req);
  }

  @PostMapping("/{passportId}/sources")
  public void sources(@PathVariable UUID passportId, @Valid @RequestBody Dto.SourceConnectRequest req) {
    service.connectSources(currentUserId(), passportId, req);
  }

  @PostMapping("/{passportId}/generate")
  public void generate(@PathVariable UUID passportId) {
    service.generate(currentUserId(), passportId);
  }
}
