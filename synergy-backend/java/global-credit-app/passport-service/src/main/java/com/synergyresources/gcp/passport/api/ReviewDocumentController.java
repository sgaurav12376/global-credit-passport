package com.synergyresources.gcp.passport.api;

import com.synergyresources.gcp.passport.security.CurrentBorrower;
import com.synergyresources.gcp.passport.service.PassportShareService;
import com.synergyresources.gcp.passport.service.ReviewDocumentService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/passports/{passportId}/shares/{shareId}/document-requests")
public class ReviewDocumentController {
  private final PassportShareService shares;
  private final ReviewDocumentService documents;

  public ReviewDocumentController(
      PassportShareService shares, ReviewDocumentService documents
  ) {
    this.shares = shares;
    this.documents = documents;
  }

  @GetMapping
  public List<ReviewDocumentService.DocumentRequestView> list(
      @PathVariable UUID passportId, @PathVariable UUID shareId
  ) {
    return documents.list(shares.authorizeBorrowerShare(
        CurrentBorrower.id(), passportId, shareId
    ));
  }

  @PostMapping(value = "/{requestId}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ReviewDocumentService.DocumentRequestView upload(
      @PathVariable UUID passportId,
      @PathVariable UUID shareId,
      @PathVariable UUID requestId,
      @RequestParam("file") MultipartFile file
  ) {
    return documents.upload(
        shares.authorizeBorrowerShare(CurrentBorrower.id(), passportId, shareId),
        requestId,
        file
    );
  }
}
