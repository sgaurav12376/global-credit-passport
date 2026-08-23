package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.plaid.PlaidDuplicateConnectionException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = PlaidController.class)
public class PlaidDuplicateConnectionHandler {

  @ExceptionHandler(PlaidDuplicateConnectionException.class)
  public ResponseEntity<Map<String, Object>> handleDuplicateConnection(
      PlaidDuplicateConnectionException exception
  ) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
        "message", exception.getMessage(),
        "code", "PLAID_DUPLICATE_CONNECTION",
        "institutionName", exception.institutionName(),
        "existingItemId", exception.existingItemId()
    ));
  }
}
