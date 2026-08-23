package com.synergyresources.gcp.passport.plaid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class PlaidDuplicateConnectionException extends RuntimeException {
  private final String institutionName;
  private final String existingItemId;

  public PlaidDuplicateConnectionException(String institutionName, String existingItemId) {
    super(institutionName + " is already connected. Refresh or remove the existing connection before reconnecting it.");
    this.institutionName = institutionName;
    this.existingItemId = existingItemId;
  }

  public String institutionName() {
    return institutionName;
  }

  public String existingItemId() {
    return existingItemId;
  }
}
