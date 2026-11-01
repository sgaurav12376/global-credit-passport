package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.crs.*;
import com.synergyresources.gcp.passport.security.CurrentBorrower;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/crs/equifax-credit-reports")
public class CrsEquifaxController {
  private final CrsEquifaxService service;
  public CrsEquifaxController(CrsEquifaxService service){this.service=service;}
  @PostMapping public CrsEquifaxService.View fetch(@Valid @RequestBody Request request){
    return service.fetch(CurrentBorrower.id(),request.passportId(),request.permissiblePurpose(),new CrsEquifaxClient.Request(request.firstName(),request.middleName(),request.lastName(),request.suffix(),request.dob(),request.ssn(),request.phone(),request.houseNumber(),request.streetName(),request.streetType(),request.apartmentNumber(),request.city(),request.state(),request.zip()));
  }
  @GetMapping("/latest") public CrsEquifaxService.View latest(@RequestParam UUID passportId){return service.latest(CurrentBorrower.id(),passportId);}
  @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<Map<String,Object>> bad(IllegalArgumentException e){return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message",e.getMessage()));}
  @ExceptionHandler(IllegalStateException.class) ResponseEntity<Map<String,Object>> unavailable(IllegalStateException e){return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message",e.getMessage(),"provider","CRS"));}
  public record Request(@NotNull UUID passportId,@NotBlank @Size(max=15) String firstName,@Size(max=15) String middleName,
      @NotBlank @Size(max=25) String lastName,@Size(max=2) String suffix,@NotBlank @Pattern(regexp="^\\d{4}-\\d{2}-\\d{2}$") String dob,
      @NotBlank @Pattern(regexp="^\\d{9}$") String ssn,String phone,@NotBlank @Size(max=10) String houseNumber,@NotBlank @Size(max=26) String streetName,
      String streetType,@Size(max=5) String apartmentNumber,@NotBlank @Size(max=20) String city,@NotBlank @Pattern(regexp="^[A-Za-z]{2}$") String state,
      @NotBlank @Pattern(regexp="^\\d{5}(-?\\d{4})?$") String zip,
      @NotBlank @Pattern(regexp="^CREDIT_TRANSACTION$") String permissiblePurpose,
      @AssertTrue(message="borrower consent is required") boolean consent){}
}
