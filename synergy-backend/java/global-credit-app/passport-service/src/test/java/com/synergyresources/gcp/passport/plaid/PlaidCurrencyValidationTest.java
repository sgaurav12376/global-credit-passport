package com.synergyresources.gcp.passport.plaid;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PlaidCurrencyValidationTest {
 @Test void confirmsUsd() { assertEquals("USD", PlaidCurrencyValidation.confirmedCurrency(20,1,0,"USD")); }
 @Test void confirmsNonUsd() { assertEquals("CAD", PlaidCurrencyValidation.confirmedCurrency(20,1,0,"CAD")); }
 @Test void rejectsMixedCurrencies() { assertNull(PlaidCurrencyValidation.confirmedCurrency(20,2,0,"USD")); }
 @Test void rejectsMissingOrConflictingRows() { assertNull(PlaidCurrencyValidation.confirmedCurrency(20,1,1,"USD")); }
 @Test void rejectsNoRows() { assertNull(PlaidCurrencyValidation.confirmedCurrency(0,0,0,null)); }
 @Test void rejectsInvalidCode() { assertNull(PlaidCurrencyValidation.confirmedCurrency(20,1,0,"XYZ")); }
 @Test void rejectsNonMonetaryCode() { assertNull(PlaidCurrencyValidation.confirmedCurrency(20,1,0,"XXX")); }
}
