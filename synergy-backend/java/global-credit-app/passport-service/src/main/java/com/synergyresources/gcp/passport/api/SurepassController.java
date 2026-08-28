package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.security.CurrentBorrower;
import com.synergyresources.gcp.passport.surepass.SurepassApiException;
import com.synergyresources.gcp.passport.surepass.SurepassClient;
import com.synergyresources.gcp.passport.surepass.SurepassCreditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/surepass/credit-reports")
public class SurepassController {
  private final SurepassCreditService creditService;

  public SurepassController(SurepassCreditService creditService) {
    this.creditService = creditService;
  }

  @PostMapping("/crif")
  public SurepassCreditService.StoredCreditReport fetchCrif(
      @Valid @RequestBody CreditReportRequest request
  ) {
    return creditService.fetchCrif(CurrentBorrower.id(), request.passportId(), new SurepassClient.CrifRequest(
        request.firstName(),
        request.lastName(),
        request.mobile(),
        request.pan()
    ));
  }

  @PostMapping("/experian")
  public SurepassCreditService.StoredCreditReport fetchExperian(
      @Valid @RequestBody CreditReportRequest request
  ) {
    return creditService.fetchExperian(CurrentBorrower.id(), request.passportId(), new SurepassClient.ExperianRequest(
        request.firstName(),
        request.lastName(),
        request.mobile(),
        request.pan()
    ));
  }

  @PostMapping("/cibil")
  public SurepassCreditService.StoredCreditReport fetchCibil(
      @Valid @RequestBody CreditReportRequest request
  ) {
    return creditService.fetchCibil(
        CurrentBorrower.id(),
        request.passportId(),
        new SurepassClient.CibilPdfRequest(
            request.firstName() + " " + request.lastName(),
            request.mobile(),
            request.pan(),
            request.gender()
        )
    );
  }

  @PostMapping("/cibil-pdf")
  public SurepassCreditService.StoredCreditReport fetchCibilPdf(
      @Valid @RequestBody CreditReportRequest request
  ) {
    return creditService.fetchCibilPdf(
        CurrentBorrower.id(),
        request.passportId(),
        new SurepassClient.CibilPdfRequest(
            request.firstName() + " " + request.lastName(),
            request.mobile(),
            request.pan(),
            request.gender()
        )
    );
  }

  @GetMapping("/{reportId}/document")
  public ResponseEntity<byte[]> document(@PathVariable UUID reportId) {
    var document = creditService.document(CurrentBorrower.id(), reportId);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(document.contentType()))
        .contentLength(document.content().length)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + document.filename() + "\""
        )
        .body(document.content());
  }

  @GetMapping("/latest")
  public SurepassCreditService.StoredCreditReport latest(@RequestParam UUID passportId) {
    return creditService.latest(CurrentBorrower.id(), passportId);
  }

  @GetMapping
  public List<SurepassCreditService.StoredCreditReport> history(
      @RequestParam UUID passportId
  ) {
    return creditService.history(CurrentBorrower.id(), passportId);
  }

  @ExceptionHandler(SurepassApiException.class)
  public ResponseEntity<Map<String, Object>> handleSurepassError(
      SurepassApiException exception
  ) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
        "message", exception.getMessage(),
        "provider", "SUREPASS",
        "providerStatus", exception.statusCode(),
        "providerCode", exception.providerCode()
    ));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, Object>> handleConfigurationError(
      IllegalStateException exception
  ) {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
        "message", exception.getMessage(),
        "provider", "SUREPASS"
    ));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleNotFound(IllegalArgumentException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "message", exception.getMessage()
    ));
  }

  public record CreditReportRequest(
      @NotNull UUID passportId,
      @NotBlank String firstName,
      @NotBlank String lastName,
      @NotBlank
      @Pattern(regexp = "^[0-9]{10}$", message = "mobile must contain 10 digits")
      String mobile,
      @NotBlank
      @Pattern(
          regexp = "^[A-Z]{5}[0-9]{4}[A-Z]$",
          message = "pan must use the expected Indian PAN format"
      )
      String pan,
      @NotBlank
      @Pattern(
          regexp = "^(?i:male|female|transgender)$",
          message = "gender must be male, female, or transgender"
      )
      String gender,
      @AssertTrue(message = "borrower consent is required")
      boolean consent
  ) {
  }
}
