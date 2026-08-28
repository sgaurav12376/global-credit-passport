package com.synergyresources.gcp.passport.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class Dto {
  public static class InitRequest {
    @NotBlank public String purpose;
    @NotBlank public String originCountry;
    @NotBlank public String destCountry;
    public String fullName;
    public LocalDate dob;
    public UUID supersedesPassportId;
  }

  public record PassportView(
      UUID passportId,
      String status,
      String purpose,
      String originCountry,
      String destCountry,
      String fullName,
      LocalDate dob,
      UUID supersedesPassportId,
      boolean plaidConnected,
      boolean creditReportConnected,
      java.time.Instant createdAt,
      java.time.Instant updatedAt
  ) {
  }

  public static class InitResponse {
    public UUID passportId;
    public String status;
    public InitResponse(UUID passportId, String status) { this.passportId = passportId; this.status = status; }
  }

  public static class SourceConnectRequest {
    @NotNull public List<String> sources;
  }
}
