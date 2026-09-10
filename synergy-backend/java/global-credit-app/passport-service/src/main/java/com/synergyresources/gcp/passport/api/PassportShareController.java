package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.security.CurrentBorrower;
import com.synergyresources.gcp.passport.service.PassportShareService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/passports/{passportId}/shares")
public class PassportShareController {
  private final PassportShareService service;
  public PassportShareController(PassportShareService service) { this.service = service; }

  @PostMapping
  public PassportShareService.CreatedShare create(
      @PathVariable UUID passportId,
      @RequestBody PassportShareService.CreateShare request
  ) {
    return service.create(CurrentBorrower.id(), passportId, request);
  }

  @GetMapping
  public List<PassportShareService.ShareSummary> list(@PathVariable UUID passportId) {
    return service.list(CurrentBorrower.id(), passportId);
  }

  @DeleteMapping("/{shareId}")
  public PassportShareService.ShareSummary revoke(
      @PathVariable UUID passportId,
      @PathVariable UUID shareId
  ) {
    return service.revoke(CurrentBorrower.id(), passportId, shareId);
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, String>> conflict(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> notFound(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", exception.getMessage()));
  }
}
