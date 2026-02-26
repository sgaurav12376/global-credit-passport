package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.api.Dto;
import com.synergyresources.gcp.passport.service.PassportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/v1/passports")
public class PassportController {
  private final PassportService service;
  public PassportController(PassportService service) { this.service = service; }

  // TODO: Replace with real JWT principal extraction from your template security layer
  private UUID currentUserId() {
    return UUID.fromString("00000000-0000-0000-0000-000000000001");
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
