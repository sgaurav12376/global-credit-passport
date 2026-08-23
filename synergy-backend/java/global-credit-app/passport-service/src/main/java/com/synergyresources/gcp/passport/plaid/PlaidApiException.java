package com.synergyresources.gcp.passport.plaid;

import com.fasterxml.jackson.databind.JsonNode;

public class PlaidApiException extends RuntimeException {
  private final JsonNode plaidError;

  public PlaidApiException(JsonNode plaidError) {
    super(plaidError.path("error_message").asText("Plaid API request failed"));
    this.plaidError = plaidError;
  }

  public JsonNode plaidError() {
    return plaidError;
  }
}
