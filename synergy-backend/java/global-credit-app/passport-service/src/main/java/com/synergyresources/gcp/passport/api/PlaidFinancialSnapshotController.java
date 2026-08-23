package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.plaid.PlaidFinancialSnapshotService;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/plaid/financial-snapshots")
public class PlaidFinancialSnapshotController {
  private final PlaidFinancialSnapshotService snapshotService;

  public PlaidFinancialSnapshotController(PlaidFinancialSnapshotService snapshotService) {
    this.snapshotService = snapshotService;
  }

  @PostMapping
  public ResponseEntity<PlaidFinancialSnapshotService.SnapshotResult> create(
      @Valid @RequestBody CreateSnapshotRequest request
  ) {
    var result = snapshotService.create(CurrentBorrower.id(), request.passportId());
    return ResponseEntity
        .created(URI.create("/v1/plaid/financial-snapshots/" + result.snapshotId()))
        .body(result);
  }

  @GetMapping("/{snapshotId}")
  public PlaidFinancialSnapshotService.SnapshotResult get(
      @PathVariable UUID snapshotId
  ) {
    return snapshotService.get(CurrentBorrower.id(), snapshotId);
  }

  @GetMapping
  public List<PlaidFinancialSnapshotService.SnapshotResult> list(
      @RequestParam UUID passportId
  ) {
    return snapshotService.list(CurrentBorrower.id(), passportId);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleInvalidRequest(
      IllegalArgumentException exception
  ) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "message", exception.getMessage()
    ));
  }

  public record CreateSnapshotRequest(@NotNull UUID passportId) {
  }
}
