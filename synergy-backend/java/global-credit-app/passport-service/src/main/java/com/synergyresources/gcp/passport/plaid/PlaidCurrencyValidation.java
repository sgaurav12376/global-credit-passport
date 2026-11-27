package com.synergyresources.gcp.passport.plaid;

import java.util.Currency;

/** No inference from destination country or account type. */
public final class PlaidCurrencyValidation {
  private PlaidCurrencyValidation() {}
  public static String confirmedCurrency(int rows, int distinct, int invalid, String code) {
    if (rows <= 0 || distinct != 1 || invalid != 0 || code == null || !code.matches("[A-Z]{3}")) return null;
    try {
      Currency currency = Currency.getInstance(code);
      return currency.getDefaultFractionDigits() >= 0 ? currency.getCurrencyCode() : null;
    } catch (IllegalArgumentException e) { return null; }
  }
}
