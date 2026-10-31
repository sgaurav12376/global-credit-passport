package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.service.PassportShareService;
import com.synergyresources.gcp.passport.service.ReviewEventStreamService;
import com.synergyresources.gcp.passport.service.ReviewDocumentService;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/v1/shared-passports")
public class SharedPassportController {
  private final PassportShareService service;
  private final ReviewEventStreamService streams;
  private final ReviewDocumentService documents;
  public SharedPassportController(
      PassportShareService service,
      ReviewEventStreamService streams,
      ReviewDocumentService documents
  ) {
    this.service = service;
    this.streams = streams;
    this.documents = documents;
  }

  @GetMapping("/{token}")
  public ResponseEntity<PassportShareService.PublicShare> open(@PathVariable String token) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Referrer-Policy", "no-referrer")
        .body(service.open(token));
  }

  @GetMapping(value = "/{token}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public ResponseEntity<SseEmitter> events(@PathVariable String token) {
    try {
      return ResponseEntity.ok(streams.subscribeLender(service.authorizeLenderStream(token)));
    } catch (PassportShareService.ShareUnavailableException exception) {
      return ResponseEntity.status(HttpStatus.GONE).build();
    } catch (IllegalArgumentException exception) {
      return ResponseEntity.notFound().build();
    }
  }

  @GetMapping("/{token}/document-requests")
  public List<ReviewDocumentService.DocumentRequestView> documentRequests(
      @PathVariable String token
  ) {
    return documents.list(service.authorizeLenderShare(token));
  }

  @PostMapping("/{token}/document-requests")
  public ReviewDocumentService.DocumentRequestView createDocumentRequest(
      @PathVariable String token,
      @RequestBody ReviewDocumentService.CreateDocumentRequest request
  ) {
    return documents.create(service.authorizeLenderShare(token), request);
  }

  @PatchMapping("/{token}/document-requests/{requestId}")
  public ReviewDocumentService.DocumentRequestView updateDocumentRequest(
      @PathVariable String token,
      @PathVariable UUID requestId,
      @RequestBody ReviewDocumentService.UpdateDocumentStatus request
  ) {
    return documents.updateStatus(service.authorizeLenderShare(token), requestId, request);
  }

  @GetMapping("/{token}/document-requests/{requestId}/download")
  public ResponseEntity<?> downloadDocument(
      @PathVariable String token, @PathVariable UUID requestId
  ) {
    var download = documents.download(service.authorizeLenderShare(token), requestId);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(download.contentType()))
        .contentLength(download.sizeBytes())
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
            .filename(download.filename()).build().toString())
        .cacheControl(CacheControl.noStore())
        .body(download.resource());
  }

  @PatchMapping("/{token}/review")
  public ResponseEntity<PassportShareService.LenderReview> updateReview(
      @PathVariable String token,
      @RequestBody PassportShareService.UpdateReview request
  ) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Referrer-Policy", "no-referrer")
        .body(service.updateReview(token, request));
  }

  @GetMapping("/{token}/review")
  public ResponseEntity<PassportShareService.LenderReview> review(@PathVariable String token) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Referrer-Policy", "no-referrer")
        .body(service.getReview(token));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, String>> conflict(RuntimeException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
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
