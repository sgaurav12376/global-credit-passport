package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;

public class SurepassApiException extends RuntimeException {
  private final int statusCode;
  private final String providerCode;

  public SurepassApiException(int statusCode, JsonNode error) {
    super(error.path("message").asText("Surepass API request failed"));
    this.statusCode = statusCode;
    this.providerCode = error.path("message_code").asText("unknown");
  }

  public int statusCode() {
    return statusCode;
  }

  public String providerCode() {
    return providerCode;
  }
}
