package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.security.CurrentBorrower;
import com.synergyresources.gcp.passport.service.LenderPassportInvitationService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/lender-invitations")
public class LenderPassportInvitationController {
  private final LenderPassportInvitationService service;

  public LenderPassportInvitationController(LenderPassportInvitationService service) {
    this.service = service;
  }

  @PostMapping
  public LenderPassportInvitationService.CreatedInvitation create(
      @RequestBody LenderPassportInvitationService.CreateInvitation request
  ) {
    return service.create(request);
  }

  @GetMapping("/{token}")
  public LenderPassportInvitationService.InvitationView view(@PathVariable String token) {
    return service.view(token);
  }

  @PostMapping("/{token}/authorize")
  public LenderPassportInvitationService.AuthorizedInvitation authorize(
      @PathVariable String token,
      @RequestBody LenderPassportInvitationService.AuthorizeInvitation request
  ) {
    return service.authorize(
        token, CurrentBorrower.id(), request.passportId(), request.consentConfirmed()
    );
  }

  @ExceptionHandler(LenderPassportInvitationService.InvitationUnavailableException.class)
  public ResponseEntity<Map<String, String>> unavailable(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", exception.getMessage()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> notFound(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
  }
}
