package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.api.Dto;
import com.synergyresources.gcp.passport.service.PassportService;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.List;

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

  @PostMapping("/{passportId}/update-draft")
  public Dto.InitResponse updateDraft(@PathVariable UUID passportId) {
    return service.getOrCreateUpdateDraft(currentUserId(), passportId);
  }

  @PatchMapping("/{passportId}")
  public Dto.PassportView saveDraft(
      @PathVariable UUID passportId,
      @Valid @RequestBody Dto.UpdateDraftRequest request
  ) {
    return service.updateDraft(currentUserId(), passportId, request);
  }

  @PostMapping("/{passportId}/identity-submission")
  public Dto.IdentitySubmissionResponse recordIdentitySubmission(
      @PathVariable UUID passportId
  ) {
    return service.recordIdentitySubmission(currentUserId(), passportId);
  }

  @PostMapping("/{passportId}/cancel-update")
  public void cancelUpdate(@PathVariable UUID passportId) {
    service.cancelUpdate(currentUserId(), passportId);
  }

  @GetMapping("/latest")
  public Dto.PassportView latest() {
    return service.latest(currentUserId());
  }

  @GetMapping
  public List<Dto.PassportView> history() {
    return service.history(currentUserId());
  }

  @GetMapping("/{passportId}")
  public Dto.PassportView get(@PathVariable UUID passportId) {
    return service.get(currentUserId(), passportId);
  }

  @PostMapping("/{passportId}/sources")
  public void sources(@PathVariable UUID passportId, @Valid @RequestBody Dto.SourceConnectRequest req) {
    service.connectSources(currentUserId(), passportId, req);
  }

  @PostMapping("/{passportId}/generate")
  public void generate(@PathVariable UUID passportId) {
    service.generate(currentUserId(), passportId);
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, String>> handleInvalidPassportState(
      IllegalStateException exception
  ) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
        "message", exception.getMessage()
    ));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleNotFound(
      IllegalArgumentException exception
  ) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "message", exception.getMessage()
    ));
  }
}
