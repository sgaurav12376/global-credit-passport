package com.synergyresources.gcp.passport.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.synergyresources.gcp.passport.model.ReviewDocumentRequest;
import com.synergyresources.gcp.passport.repo.ReviewDocumentRequestRepo;
import com.synergyresources.gcp.passport.repo.ReviewDocumentSubmissionRepo;
import java.util.Optional;
import java.util.UUID;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.multipart.MultipartFile;

class ReviewDocumentServiceTest {
  @Test
  void borrowerCanUploadRequestedPdf() throws Exception {
    ReviewDocumentRequestRepo requests = mock(ReviewDocumentRequestRepo.class);
    ReviewDocumentSubmissionRepo submissions = mock(ReviewDocumentSubmissionRepo.class);
    ReviewDocumentStorage storage = mock(ReviewDocumentStorage.class);
    ReviewDocumentRequest request = mock(ReviewDocumentRequest.class);
    MultipartFile file = mock(MultipartFile.class);
    UUID requestId = UUID.randomUUID();
    UUID shareId = UUID.randomUUID();
    var access = new PassportShareService.ShareAccess(shareId, UUID.randomUUID(), UUID.randomUUID());
    when(request.getId()).thenReturn(requestId);
    when(request.getStatus()).thenReturn("REQUESTED");
    when(requests.findByIdAndShareGrantId(requestId, shareId)).thenReturn(Optional.of(request));
    when(file.isEmpty()).thenReturn(false);
    when(file.getSize()).thenReturn(1024L);
    when(file.getContentType()).thenReturn("application/pdf");
    when(file.getInputStream()).thenReturn(new ByteArrayInputStream("%PDF-test".getBytes()));
    when(storage.store(shareId, requestId, file)).thenReturn(
        new ReviewDocumentStorage.StoredDocument("key", "statement.pdf", "application/pdf", 1024)
    );
    ReviewDocumentService service = new ReviewDocumentService(
        requests, submissions, storage, mock(ApplicationEventPublisher.class)
    );

    service.upload(access, requestId, file);

    verify(request).setStatus("UPLOADED");
    verify(submissions).save(any());
  }

  @Test
  void executableFilesAreRejected() {
    ReviewDocumentRequestRepo requests = mock(ReviewDocumentRequestRepo.class);
    ReviewDocumentRequest request = mock(ReviewDocumentRequest.class);
    MultipartFile file = mock(MultipartFile.class);
    UUID requestId = UUID.randomUUID();
    UUID shareId = UUID.randomUUID();
    var access = new PassportShareService.ShareAccess(shareId, UUID.randomUUID(), UUID.randomUUID());
    when(request.getStatus()).thenReturn("REQUESTED");
    when(requests.findByIdAndShareGrantId(requestId, shareId)).thenReturn(Optional.of(request));
    when(file.isEmpty()).thenReturn(false);
    when(file.getSize()).thenReturn(1024L);
    when(file.getContentType()).thenReturn("application/x-msdownload");
    ReviewDocumentService service = new ReviewDocumentService(
        requests, mock(ReviewDocumentSubmissionRepo.class), mock(ReviewDocumentStorage.class),
        mock(ApplicationEventPublisher.class)
    );

    assertThrows(IllegalArgumentException.class, () -> service.upload(access, requestId, file));
  }
}
