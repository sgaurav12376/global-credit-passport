package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.entrust.EntrustApiException;
import com.synergyresources.gcp.passport.entrust.EntrustVerificationService;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/entrust/passports/{passportId}/verification")
public class EntrustController {
  private final EntrustVerificationService service;

  public EntrustController(EntrustVerificationService service) { this.service = service; }

  @PostMapping
  public EntrustVerificationService.VerificationResponse start(@PathVariable UUID passportId) {
    return service.start(CurrentBorrower.id(), passportId);
  }

  @GetMapping
  public ResponseEntity<EntrustVerificationService.VerificationResponse> latest(
      @PathVariable UUID passportId
  ) {
    var result = service.latest(CurrentBorrower.id(), passportId);
    return result == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(result);
  }

  @PostMapping("/refresh")
  public EntrustVerificationService.VerificationResponse refresh(@PathVariable UUID passportId) {
    return service.refresh(CurrentBorrower.id(), passportId);
  }

  @ExceptionHandler(EntrustApiException.class)
  public ResponseEntity<Map<String, Object>> handleEntrust(EntrustApiException exception) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
        "message", exception.getMessage(),
        "provider", "ENTRUST",
        "providerStatus", exception.providerStatus()
    ));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, Object>> handleInvalidState(IllegalStateException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
        "message", exception.getMessage()
    ));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleNotFound(IllegalArgumentException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "message", exception.getMessage()
    ));
  }
}
