package com.synergyresources.gcp.passport.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import com.synergyresources.gcp.passport.surepass.SurepassCreditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/local-simulations/credit-reports")
@ConditionalOnProperty(name = "gcp.security.auth-mode", havingValue = "local")
public class LocalCreditSimulationController {
  private final SurepassCreditService creditService;

  public LocalCreditSimulationController(SurepassCreditService creditService) {
    this.creditService = creditService;
  }

  @PostMapping("/cibil")
  public SurepassCreditService.StoredCreditReport simulateCibil(
      @Valid @RequestBody SimulationRequest request
  ) {
    return creditService.simulateCibil(
        CurrentBorrower.id(), request.passportId(), request.scenario()
    );
  }

  @PostMapping("/multi-bureau")
  public SurepassCreditService.MultiBureauResult simulateMultiBureau(
      @Valid @RequestBody MultiBureauSimulationRequest request
  ) {
    return creditService.simulateMultiBureau(
        CurrentBorrower.id(), request.passportId(), request.scenario()
    );
  }

  @PostMapping("/multi-bureau/import")
  public SurepassCreditService.MultiBureauResult importFinpassTestResponse(
      @Valid @RequestBody ProviderTestImportRequest request
  ) {
    return creditService.importFinpassTestResponse(
        CurrentBorrower.id(), request.passportId(), request.response()
    );
  }

  public record SimulationRequest(
      @NotNull UUID passportId,
      @Pattern(
          regexp = "^(?i:strong|balanced|high_risk)$",
          message = "scenario must be STRONG, BALANCED, or HIGH_RISK"
      )
      String scenario,
      @AssertTrue(message = "simulation acknowledgement is required")
      boolean simulationAcknowledged
  ) {}

  public record MultiBureauSimulationRequest(
      @NotNull UUID passportId,
      @Pattern(
          regexp = "^(?i:complete|partial)$",
          message = "scenario must be COMPLETE or PARTIAL"
      )
      String scenario,
      @AssertTrue(message = "simulation acknowledgement is required")
      boolean simulationAcknowledged
  ) {}

  public record ProviderTestImportRequest(
      @NotNull UUID passportId,
      @NotNull JsonNode response,
      @AssertTrue(message = "provider test-data acknowledgement is required")
      boolean providerTestAcknowledged
  ) {}
}
