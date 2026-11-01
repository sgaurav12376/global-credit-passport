package com.synergyresources.gcp.passport.service;

import com.synergyresources.gcp.passport.model.ReviewDocumentRequest;
import com.synergyresources.gcp.passport.model.ReviewDocumentSubmission;
import com.synergyresources.gcp.passport.repo.ReviewDocumentRequestRepo;
import com.synergyresources.gcp.passport.repo.ReviewDocumentSubmissionRepo;
import jakarta.transaction.Transactional;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReviewDocumentService {
  private static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;
  private static final Set<String> ALLOWED_TYPES = Set.of(
      "application/pdf", "image/png", "image/jpeg"
  );
  private final ReviewDocumentRequestRepo requestRepo;
  private final ReviewDocumentSubmissionRepo submissionRepo;
  private final ReviewDocumentStorage storage;
  private final ApplicationEventPublisher events;

  public ReviewDocumentService(
      ReviewDocumentRequestRepo requestRepo,
      ReviewDocumentSubmissionRepo submissionRepo,
      ReviewDocumentStorage storage,
      ApplicationEventPublisher events
  ) {
    this.requestRepo = requestRepo;
    this.submissionRepo = submissionRepo;
    this.storage = storage;
    this.events = events;
  }

  @Transactional
  public DocumentRequestView create(
      PassportShareService.ShareAccess access, CreateDocumentRequest input
  ) {
    String type = required(input.documentType(), 100, "Document type is required");
    String description = optional(input.description(), 1000);
    ReviewDocumentRequest request = new ReviewDocumentRequest();
    request.setShareGrantId(access.shareId());
    request.setDocumentType(type);
    request.setDescription(description);
    request.setRequired(input.required());
    request.setDueDate(input.dueDate());
    request.setStatus("REQUESTED");
    request.setUpdatedAt(Instant.now());
    requestRepo.saveAndFlush(request);
    publish(access, "DOCUMENT_REQUESTED");
    return view(request);
  }

  public List<DocumentRequestView> list(PassportShareService.ShareAccess access) {
    return requestRepo.findByShareGrantIdOrderByCreatedAtAsc(access.shareId())
        .stream().map(this::view).toList();
  }

  @Transactional
  public DocumentRequestView upload(
      PassportShareService.ShareAccess access, UUID requestId, MultipartFile file
  ) {
    ReviewDocumentRequest request = request(access, requestId);
    if (!Set.of("REQUESTED", "REPLACEMENT_REQUESTED").contains(request.getStatus())) {
      throw new IllegalStateException("This document request is not accepting an upload");
    }
    validate(file);
    ReviewDocumentStorage.StoredDocument stored;
    try {
      stored = storage.store(access.shareId(), requestId, file);
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to store the document", exception);
    }
    Instant now = Instant.now();
    submissionRepo.findFirstByRequestIdAndSupersededAtIsNullOrderByUploadedAtDesc(requestId)
        .ifPresent(previous -> {
          previous.setSupersededAt(now);
          submissionRepo.save(previous);
        });
    ReviewDocumentSubmission submission = new ReviewDocumentSubmission();
    submission.setRequestId(requestId);
    submission.setStorageKey(stored.storageKey());
    submission.setOriginalFilename(cleanFilename(stored.filename()));
    submission.setContentType(stored.contentType());
    submission.setSizeBytes(stored.sizeBytes());
    submissionRepo.save(submission);
    request.setStatus("UPLOADED");
    request.setUpdatedAt(now);
    requestRepo.saveAndFlush(request);
    publish(access, "DOCUMENT_UPLOADED");
    return view(request);
  }

  @Transactional
  public DocumentRequestView updateStatus(
      PassportShareService.ShareAccess access, UUID requestId, UpdateDocumentStatus input
  ) {
    ReviewDocumentRequest request = request(access, requestId);
    String status = required(input.status(), 40, "Document status is required").toUpperCase();
    if (!Set.of("ACCEPTED", "REPLACEMENT_REQUESTED").contains(status)) {
      throw new IllegalArgumentException("Unsupported document status");
    }
    if (!"UPLOADED".equals(request.getStatus())) {
      throw new IllegalStateException("Review an uploaded document before changing its status");
    }
    request.setStatus(status);
    request.setUpdatedAt(Instant.now());
    requestRepo.saveAndFlush(request);
    publish(access, status);
    return view(request);
  }

  public DownloadedDocument download(PassportShareService.ShareAccess access, UUID requestId) {
    ReviewDocumentRequest request = request(access, requestId);
    ReviewDocumentSubmission submission = submissionRepo
        .findFirstByRequestIdAndSupersededAtIsNullOrderByUploadedAtDesc(request.getId())
        .orElseThrow(() -> new IllegalArgumentException("No document has been uploaded"));
    return new DownloadedDocument(
        storage.load(submission.getStorageKey()), submission.getOriginalFilename(),
        submission.getContentType(), submission.getSizeBytes()
    );
  }

  private ReviewDocumentRequest request(PassportShareService.ShareAccess access, UUID requestId) {
    return requestRepo.findByIdAndShareGrantId(requestId, access.shareId())
        .orElseThrow(() -> new IllegalArgumentException("Document request not found"));
  }

  private DocumentRequestView view(ReviewDocumentRequest request) {
    var submission = submissionRepo
        .findFirstByRequestIdAndSupersededAtIsNullOrderByUploadedAtDesc(request.getId())
        .orElse(null);
    return new DocumentRequestView(
        request.getId(), request.getDocumentType(), request.getDescription(), request.isRequired(),
        request.getDueDate(), request.getStatus(), request.getCreatedAt(), request.getUpdatedAt(),
        submission == null ? null : submission.getOriginalFilename(),
        submission == null ? null : submission.getContentType(),
        submission == null ? null : submission.getSizeBytes(),
        submission == null ? null : submission.getUploadedAt()
    );
  }

  private void validate(MultipartFile file) {
    if (file == null || file.isEmpty()) throw new IllegalArgumentException("Select a document to upload");
    if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("Document must be 10 MB or smaller");
    if (!ALLOWED_TYPES.contains(file.getContentType())) {
      throw new IllegalArgumentException("Only PDF, PNG and JPEG documents are supported");
    }
    try (var input = file.getInputStream()) {
      byte[] header = input.readNBytes(8);
      boolean valid = switch (file.getContentType()) {
        case "application/pdf" -> startsWith(header, new byte[] {'%', 'P', 'D', 'F'});
        case "image/png" -> startsWith(header, new byte[] {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
        });
        case "image/jpeg" -> startsWith(header, new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
        default -> false;
      };
      if (!valid) throw new IllegalArgumentException("Document content does not match its file type");
    } catch (IOException exception) {
      throw new IllegalArgumentException("Unable to inspect the uploaded document", exception);
    }
  }

  private boolean startsWith(byte[] value, byte[] prefix) {
    if (value.length < prefix.length) return false;
    for (int index = 0; index < prefix.length; index++) {
      if (value[index] != prefix[index]) return false;
    }
    return true;
  }

  private String cleanFilename(String filename) {
    String cleaned = filename.replace('\\', '/');
    cleaned = cleaned.substring(cleaned.lastIndexOf('/') + 1).trim();
    return cleaned.isEmpty() ? "document" : cleaned.substring(0, Math.min(cleaned.length(), 255));
  }

  private String required(String value, int max, String message) {
    String result = optional(value, max);
    if (result == null) throw new IllegalArgumentException(message);
    return result;
  }

  private String optional(String value, int max) {
    if (value == null || value.isBlank()) return null;
    String result = value.trim();
    if (result.length() > max) throw new IllegalArgumentException("Document request details are too long");
    return result;
  }

  private void publish(PassportShareService.ShareAccess access, String eventType) {
    events.publishEvent(new ReviewChangedEvent(
        access.passportId(), access.shareId(), eventType, Instant.now()
    ));
  }

  public record CreateDocumentRequest(
      String documentType, String description, boolean required, LocalDate dueDate
  ) {}
  public record UpdateDocumentStatus(String status) {}
  public record DocumentRequestView(
      UUID requestId, String documentType, String description, boolean required,
      LocalDate dueDate, String status, Instant createdAt, Instant updatedAt,
      String filename, String contentType, Long sizeBytes, Instant uploadedAt
  ) {}
  public record DownloadedDocument(
      Resource resource, String filename, String contentType, long sizeBytes
  ) {}
}
