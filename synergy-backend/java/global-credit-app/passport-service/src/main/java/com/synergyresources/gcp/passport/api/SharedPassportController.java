package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.service.PassportShareService;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/shared-passports")
public class SharedPassportController {
  private final PassportShareService service;
  public SharedPassportController(PassportShareService service) { this.service = service; }

  @GetMapping("/{token}")
  public ResponseEntity<PassportShareService.PublicShare> open(@PathVariable String token) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Referrer-Policy", "no-referrer")
        .body(service.open(token));
  }

  @ExceptionHandler(PassportShareService.ShareUnavailableException.class)
  public ResponseEntity<Map<String, String>> unavailable(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", exception.getMessage()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> notFound(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
  }
}
