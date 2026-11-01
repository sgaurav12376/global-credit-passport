package com.synergyresources.gcp.passport.entrust;

public class EntrustApiException extends RuntimeException {
  private final int providerStatus;

  public EntrustApiException(String message, int providerStatus) {
    super(message);
    this.providerStatus = providerStatus;
  }

  public int providerStatus() { return providerStatus; }
}
