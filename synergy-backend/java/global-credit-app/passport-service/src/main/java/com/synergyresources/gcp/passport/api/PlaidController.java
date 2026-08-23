package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.plaid.PlaidApiException;
import com.synergyresources.gcp.passport.plaid.PlaidService;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import com.synergyresources.gcp.passport.plaid.PlaidFinancialSummaryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@RestController
@RequestMapping("/v1/plaid")
public class PlaidController {
  private final PlaidService plaidService;
  private final PlaidFinancialSummaryService financialSummaryService;

  public PlaidController(
      PlaidService plaidService,
      PlaidFinancialSummaryService financialSummaryService
  ) {
    this.plaidService = plaidService;
    this.financialSummaryService = financialSummaryService;
  }

  private UUID currentUserId() {
    return CurrentBorrower.id();
  }

  @PostMapping("/link-token")
  public PlaidService.LinkTokenResponse createLinkToken(
      @Valid @RequestBody(required = false) LinkTokenRequest request
  ) {
    return plaidService.createLinkToken(currentUserId());
  }

  @PostMapping("/connections")
  public PlaidService.ConnectionResult connectAndFetch(
      @Valid @RequestBody ConnectionRequest request
  ) {
    return plaidService.connectAndFetch(
        currentUserId(),
        request.passportId(),
        request.publicToken()
    );
  }

  @PostMapping("/connections/{itemId}/refresh")
  public PlaidService.ConnectionResult refreshTransactions(
      @PathVariable String itemId
  ) {
    return plaidService.refreshTransactions(currentUserId(), itemId);
  }

  @GetMapping("/connections/latest")
  public PlaidService.ConnectionResult latestConnection() {
    return plaidService.latestConnection(currentUserId());
  }

  @GetMapping("/connections")
  public List<PlaidService.ConnectionResult> connections() {
    return plaidService.connections(currentUserId());
  }

  @GetMapping("/financial-summary")
  public PlaidFinancialSummaryService.FinancialSummary financialSummary() {
    return financialSummaryService.getSummary(currentUserId());
  }

  @DeleteMapping("/connections/{itemId}")
  public ResponseEntity<Void> removeConnection(@PathVariable String itemId) {
    plaidService.removeConnection(currentUserId(), itemId);
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleInvalidRequest(
      IllegalArgumentException exception
  ) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "message", exception.getMessage()
    ));
  }

  @ExceptionHandler(PlaidApiException.class)
  public ResponseEntity<Map<String, Object>> handlePlaidError(PlaidApiException exception) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
        "message", exception.getMessage(),
        "provider", "PLAID",
        "providerError", exception.plaidError()
    ));
  }

  public record LinkTokenRequest() {
  }

  public record ConnectionRequest(
      UUID passportId,
      @NotBlank String publicToken
  ) {
  }
}
