package com.synergyresources.gcp.passport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.synergyresources.gcp.passport.model.PassportOutput;
import com.synergyresources.gcp.passport.model.PassportShareGrant;
import com.synergyresources.gcp.passport.model.LenderReviewEvent;
import com.synergyresources.gcp.passport.repo.LenderReviewEventRepo;
import com.synergyresources.gcp.passport.repo.PassportOutputRepo;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PassportShareGrantRepo;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;

@Service
public class PassportShareService {
  public static final String SCOPE = "LENDER_RISK_REPORT_V1";
  public static final String CONSENT_VERSION = "GCP_LENDER_SHARE_CONSENT_V1";
  private static final SecureRandom RANDOM = new SecureRandom();

  private final PassportShareGrantRepo shareRepo;
  private final LenderReviewEventRepo reviewEventRepo;
  private final PassportRepo passportRepo;
  private final PassportOutputRepo outputRepo;
  private final ObjectMapper objectMapper;
  private final ApplicationEventPublisher eventPublisher;

  public PassportShareService(
      PassportShareGrantRepo shareRepo,
      LenderReviewEventRepo reviewEventRepo,
      PassportRepo passportRepo,
      PassportOutputRepo outputRepo,
      ObjectMapper objectMapper,
      ApplicationEventPublisher eventPublisher
  ) {
    this.shareRepo = shareRepo;
    this.reviewEventRepo = reviewEventRepo;
    this.passportRepo = passportRepo;
    this.outputRepo = outputRepo;
    this.objectMapper = objectMapper;
    this.eventPublisher = eventPublisher;
  }

  @Transactional
  public CreatedShare create(UUID borrowerId, UUID passportId, CreateShare request) {
    return createWithToken(borrowerId, passportId, request, token(), null);
  }

  CreatedShare createWithToken(
      UUID borrowerId, UUID passportId, CreateShare request, String token,
      Instant expiresAtOverride
  ) {
    var passport = passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    if (!"ACTIVE".equals(passport.getStatus())) {
      throw new IllegalStateException("Only a published passport can be shared");
    }
    if (!request.consentConfirmed()) {
      throw new IllegalStateException("Confirm consent before creating a lender share");
    }
    String recipient = required(request.recipientName(), "Recipient name is required");
    String purpose = required(request.purpose(), "Sharing purpose is required");
    int days = request.expiresInDays() == null ? 7 : request.expiresInDays();
    if (days < 1 || days > 30) {
      throw new IllegalArgumentException("Share expiration must be between 1 and 30 days");
    }
    PassportOutput output = outputRepo
        .findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId)
        .orElseThrow(() -> new IllegalStateException("Publish the passport before sharing it"));
    if (!output.getDocument().path("riskAssessment").has("calculationTrace")) {
      throw new IllegalStateException(
          "Regenerate this passport with the current risk model before sharing it"
      );
    }
    Instant now = Instant.now();
    PassportShareGrant grant = new PassportShareGrant();
    grant.setBorrowerId(borrowerId);
    grant.setPassportId(passportId);
    grant.setOutputId(output.getId());
    grant.setTokenHash(sha256(token));
    grant.setRecipientName(recipient);
    grant.setPurpose(purpose);
    grant.setScope(SCOPE);
    grant.setConsentVersion(CONSENT_VERSION);
    grant.setConsentedAt(now);
    grant.setExpiresAt(
        expiresAtOverride == null ? now.plus(days, ChronoUnit.DAYS) : expiresAtOverride
    );
    grant.setReviewStatus("NOT_OPENED");
    shareRepo.saveAndFlush(grant);
    return new CreatedShare(grant.getId(), token, recipient, purpose, grant.getExpiresAt());
  }

  public List<ShareSummary> list(UUID borrowerId, UUID passportId) {
    passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
    Instant now = Instant.now();
    return shareRepo.findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId)
        .stream().map(grant -> summary(grant, now)).toList();
  }

  String status(UUID shareId, Instant now) {
    return shareRepo.findById(shareId)
        .map(grant -> grant.getRevokedAt() != null ? "REVOKED"
            : grant.getExpiresAt().isAfter(now) ? "AUTHORIZED" : "EXPIRED")
        .orElse("UNAVAILABLE");
  }

  @Transactional
  public ShareSummary revoke(UUID borrowerId, UUID passportId, UUID shareId) {
    PassportShareGrant grant = shareRepo.findByIdAndBorrowerId(shareId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Share not found"));
    if (!passportId.equals(grant.getPassportId())) {
      throw new IllegalArgumentException("Share not found");
    }
    if (grant.getRevokedAt() == null) grant.setRevokedAt(Instant.now());
    ShareSummary result = summary(shareRepo.saveAndFlush(grant), Instant.now());
    publish(grant, "SHARE_REVOKED");
    return result;
  }

  @Transactional
  public CreatedShare replaceLink(
      UUID borrowerId, UUID passportId, UUID shareId, ReplaceLinkRequest request
  ) {
    PassportShareGrant grant = shareRepo.findByIdAndBorrowerId(shareId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Share not found"));
    if (!passportId.equals(grant.getPassportId())) {
      throw new IllegalArgumentException("Share not found");
    }
    Instant now = Instant.now();
    if (grant.getRevokedAt() != null || !grant.getExpiresAt().isAfter(now)) {
      throw new IllegalStateException("Only an active lender link can be replaced");
    }
    int days = request == null || request.expiresInDays() == null ? 7 : request.expiresInDays();
    if (days < 1 || days > 30) {
      throw new IllegalArgumentException("Replacement access must be between 1 and 30 days");
    }

    String replacementToken = token();
    grant.setTokenHash(sha256(replacementToken));
    grant.setConsentedAt(now);
    grant.setExpiresAt(now.plus(days, ChronoUnit.DAYS));

    LenderReviewEvent event = new LenderReviewEvent();
    event.setShareGrantId(grant.getId());
    event.setEventType("ACCESS_LINK_REPLACED");
    event.setFromStatus(grant.getReviewStatus());
    event.setToStatus(grant.getReviewStatus() == null ? "NOT_OPENED" : grant.getReviewStatus());
    reviewEventRepo.save(event);

    shareRepo.saveAndFlush(grant);
    // Terminate any browser using the previous capability URL. The replacement uses the same
    // share id, so review history and document requests remain attached to this application.
    publish(grant, "SHARE_REVOKED");
    return new CreatedShare(
        grant.getId(), replacementToken, grant.getRecipientName(), grant.getPurpose(),
        grant.getExpiresAt()
    );
  }

  @Transactional
  public BorrowerReview respond(
      UUID borrowerId, UUID passportId, UUID shareId, BorrowerResponseRequest request
  ) {
    PassportShareGrant grant = shareRepo.findByIdAndBorrowerId(shareId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Share not found"));
    if (!passportId.equals(grant.getPassportId())) {
      throw new IllegalArgumentException("Share not found");
    }
    Instant now = Instant.now();
    if (grant.getRevokedAt() != null || !grant.getExpiresAt().isAfter(now)) {
      throw new IllegalStateException("This passport share is no longer active");
    }
    if (!"INFORMATION_REQUESTED".equals(grant.getReviewStatus())) {
      throw new IllegalStateException("A response can only be submitted for an information request");
    }
    String response = optional(request.response(), 4000);
    if (response == null) throw new IllegalArgumentException("Enter a response for the lender");

    grant.setBorrowerResponse(response);
    grant.setBorrowerRespondedAt(now);
    grant.setReviewStatus("UNDER_REVIEW");
    grant.setReviewUpdatedAt(now);

    LenderReviewEvent event = new LenderReviewEvent();
    event.setShareGrantId(grant.getId());
    event.setEventType("BORROWER_RESPONDED");
    event.setFromStatus("INFORMATION_REQUESTED");
    event.setToStatus("UNDER_REVIEW");
    event.setBorrowerMessage(grant.getBorrowerMessage());
    event.setBorrowerResponse(response);
    reviewEventRepo.save(event);
    shareRepo.saveAndFlush(grant);
    publish(grant, "BORROWER_RESPONDED");
    return borrowerReview(grant);
  }

  @Transactional
  public PublicShare open(String token) {
    PassportShareGrant grant = shareRepo.findByTokenHash(sha256(token))
        .orElseThrow(() -> new IllegalArgumentException("Shared passport not found"));
    Instant now = Instant.now();
    if (grant.getRevokedAt() != null || !grant.getExpiresAt().isAfter(now)) {
      throw new ShareUnavailableException("This passport share is no longer available");
    }
    PassportOutput output = outputRepo.findByIdAndBorrowerIdAndPassportId(
        grant.getOutputId(), grant.getBorrowerId(), grant.getPassportId()
    ).orElseThrow(() -> new IllegalArgumentException("Shared passport output not found"));
    grant.setLastAccessedAt(now);
    grant.setAccessCount(grant.getAccessCount() + 1);
    boolean firstOpen = grant.getReviewStatus() == null || "NOT_OPENED".equals(grant.getReviewStatus());
    if (firstOpen) {
      changeReviewStatus(grant, "VIEWED", null, now);
    }
    shareRepo.save(grant);
    if (firstOpen) publish(grant, "REPORT_VIEWED");
    return new PublicShare(
        grant.getRecipientName(), grant.getPurpose(), grant.getScope(), grant.getConsentedAt(),
        grant.getExpiresAt(), redacted(output), output.getCreatedAt(), lenderReview(grant)
    );
  }

  @Transactional
  public LenderReview updateReview(String token, UpdateReview request) {
    PassportShareGrant grant = availableGrant(token);
    String nextStatus = requiredStatus(request.status());
    String currentStatus = grant.getReviewStatus() == null ? "NOT_OPENED" : grant.getReviewStatus();
    if ("NOT_OPENED".equals(currentStatus)) currentStatus = "VIEWED";
    validateTransition(currentStatus, nextStatus);

    String borrowerMessage = optional(request.borrowerMessage(), 2000);
    String internalNote = optional(request.internalNote(), 4000);
    String outcome = optionalEnum(request.outcome(), Set.of("PROCEED", "FURTHER_REVIEW", "DECLINE"));
    if ("INFORMATION_REQUESTED".equals(nextStatus) && borrowerMessage == null) {
      throw new IllegalArgumentException("Describe the additional information requested");
    }
    if ("COMPLETED".equals(nextStatus) && outcome == null) {
      throw new IllegalArgumentException("Select an outcome before completing the review");
    }
    if (!"COMPLETED".equals(nextStatus) && outcome != null) {
      throw new IllegalArgumentException("An outcome can only be recorded for a completed review");
    }

    Instant now = Instant.now();
    if (!nextStatus.equals(grant.getReviewStatus())) {
      changeReviewStatus(grant, nextStatus, borrowerMessage, now);
    }
    if ("INFORMATION_REQUESTED".equals(nextStatus)) {
      grant.setBorrowerResponse(null);
      grant.setBorrowerRespondedAt(null);
    }
    grant.setBorrowerMessage(borrowerMessage);
    grant.setInternalNote(internalNote);
    grant.setReviewOutcome(outcome);
    grant.setReviewUpdatedAt(now);
    grant.setReviewCompletedAt("COMPLETED".equals(nextStatus) ? now : null);
    shareRepo.saveAndFlush(grant);
    publish(grant, "REVIEW_UPDATED");
    return lenderReview(grant);
  }

  public void authorizeBorrowerStream(UUID borrowerId, UUID passportId) {
    passportRepo.findByIdAndUserId(passportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Passport not found"));
  }

  public UUID authorizeLenderStream(String token) {
    return availableGrant(token).getId();
  }

  public ShareAccess authorizeLenderShare(String token) {
    PassportShareGrant grant = availableGrant(token);
    return new ShareAccess(grant.getId(), grant.getBorrowerId(), grant.getPassportId());
  }

  public ShareAccess authorizeBorrowerShare(UUID borrowerId, UUID passportId, UUID shareId) {
    PassportShareGrant grant = shareRepo.findByIdAndBorrowerId(shareId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Share not found"));
    if (!passportId.equals(grant.getPassportId())) throw new IllegalArgumentException("Share not found");
    Instant now = Instant.now();
    if (grant.getRevokedAt() != null || !grant.getExpiresAt().isAfter(now)) {
      throw new IllegalStateException("This passport share is no longer active");
    }
    return new ShareAccess(grant.getId(), grant.getBorrowerId(), grant.getPassportId());
  }

  public LenderReview getReview(String token) {
    return lenderReview(availableGrant(token));
  }

  private void publish(PassportShareGrant grant, String eventType) {
    eventPublisher.publishEvent(new ReviewChangedEvent(
        grant.getPassportId(), grant.getId(), eventType, Instant.now()
    ));
  }

  private JsonNode redacted(PassportOutput output) {
    JsonNode source = output.getDocument();
    ObjectNode report = objectMapper.createObjectNode();
    report.put("schemaVersion", output.getSchemaVersion());
    report.put("passportId", output.getPassportId().toString());
    report.set("subject", source.path("subject").deepCopy());
    report.set("corridor", source.path("corridor").deepCopy());
    report.set("identityVerification", identitySummary(source.path("identityVerification")));
    copy(report, source, "evidenceEnvironment");
    copy(report, source, "evidenceCoverage");
    copy(report, source, "creditReconciliation");
    copy(report, source, "riskAssessment");
    return report;
  }

  private ObjectNode identitySummary(JsonNode identity) {
    ObjectNode result = objectMapper.createObjectNode();
    result.put("provider", identity.path("provider").asText());
    result.put("status", identity.path("status").asText());
    result.put("sandboxSimulation", identity.path("sandboxSimulation").asBoolean());
    result.put("approvalRequiredForPilot", identity.path("approvalRequiredForPilot").asBoolean());
    return result;
  }

  private void copy(ObjectNode target, JsonNode source, String field) {
    if (source.has(field)) target.set(field, source.path(field).deepCopy());
  }

  private ShareSummary summary(PassportShareGrant grant, Instant now) {
    String status = grant.getRevokedAt() != null ? "REVOKED"
        : grant.getExpiresAt().isAfter(now) ? "ACTIVE" : "EXPIRED";
    return new ShareSummary(
        grant.getId(), grant.getRecipientName(), grant.getPurpose(), grant.getScope(), status,
        grant.getConsentedAt(), grant.getExpiresAt(), grant.getRevokedAt(),
        grant.getLastAccessedAt(), grant.getAccessCount(), borrowerReview(grant),
        reviewEventRepo.findByShareGrantIdOrderByCreatedAtAsc(grant.getId()).stream()
            .map(event -> new ReviewEventSummary(
                event.getEventType(), event.getFromStatus(), event.getToStatus(),
                event.getBorrowerMessage(), event.getBorrowerResponse(), event.getCreatedAt()
            )).toList()
    );
  }

  private PassportShareGrant availableGrant(String token) {
    PassportShareGrant grant = shareRepo.findByTokenHash(sha256(token))
        .orElseThrow(() -> new IllegalArgumentException("Shared passport not found"));
    Instant now = Instant.now();
    if (grant.getRevokedAt() != null || !grant.getExpiresAt().isAfter(now)) {
      throw new ShareUnavailableException("This passport share is no longer available");
    }
    return grant;
  }

  private void changeReviewStatus(
      PassportShareGrant grant, String nextStatus, String borrowerMessage, Instant now
  ) {
    String previous = grant.getReviewStatus() == null ? "NOT_OPENED" : grant.getReviewStatus();
    grant.setReviewStatus(nextStatus);
    grant.setReviewUpdatedAt(now);
    LenderReviewEvent event = new LenderReviewEvent();
    event.setShareGrantId(grant.getId());
    event.setEventType("REVIEW_STATUS_CHANGED");
    event.setFromStatus(previous);
    event.setToStatus(nextStatus);
    event.setBorrowerMessage(borrowerMessage);
    reviewEventRepo.save(event);
  }

  private void validateTransition(String current, String next) {
    if (current.equals(next)) return;
    boolean valid = switch (current) {
      case "VIEWED" -> Set.of("UNDER_REVIEW", "INFORMATION_REQUESTED", "COMPLETED").contains(next);
      case "UNDER_REVIEW" -> Set.of("INFORMATION_REQUESTED", "COMPLETED").contains(next);
      case "INFORMATION_REQUESTED" -> Set.of("UNDER_REVIEW", "COMPLETED").contains(next);
      case "COMPLETED" -> false;
      default -> false;
    };
    if (!valid) throw new IllegalStateException("Review cannot move from " + current + " to " + next);
  }

  private String requiredStatus(String value) {
    String status = optionalEnum(
        value, Set.of("UNDER_REVIEW", "INFORMATION_REQUESTED", "COMPLETED")
    );
    if (status == null) throw new IllegalArgumentException("Review status is required");
    return status;
  }

  private String optionalEnum(String value, Set<String> allowed) {
    if (value == null || value.isBlank()) return null;
    String normalized = value.trim().toUpperCase();
    if (!allowed.contains(normalized)) throw new IllegalArgumentException("Unsupported review value");
    return normalized;
  }

  private String optional(String value, int maxLength) {
    if (value == null || value.isBlank()) return null;
    String result = value.trim();
    if (result.length() > maxLength) throw new IllegalArgumentException("Review details are too long");
    return result;
  }

  private BorrowerReview borrowerReview(PassportShareGrant grant) {
    return new BorrowerReview(
        grant.getReviewStatus() == null ? "NOT_OPENED" : grant.getReviewStatus(),
        grant.getReviewOutcome(), grant.getBorrowerMessage(), grant.getBorrowerResponse(),
        grant.getBorrowerRespondedAt(), grant.getReviewUpdatedAt(), grant.getReviewCompletedAt()
    );
  }

  private LenderReview lenderReview(PassportShareGrant grant) {
    return new LenderReview(
        grant.getReviewStatus() == null ? "NOT_OPENED" : grant.getReviewStatus(),
        grant.getReviewOutcome(), grant.getBorrowerMessage(), grant.getBorrowerResponse(),
        grant.getBorrowerRespondedAt(), grant.getInternalNote(), grant.getReviewUpdatedAt(),
        grant.getReviewCompletedAt()
    );
  }

  private String required(String value, String message) {
    if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
    String result = value.trim();
    if (result.length() > 200) throw new IllegalArgumentException("Share details are too long");
    return result;
  }

  private String token() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String sha256(String value) {
    if (value == null || value.isBlank()) throw new IllegalArgumentException("Share token is required");
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  public record CreateShare(
      String recipientName, String purpose, Integer expiresInDays, boolean consentConfirmed
  ) {}
  public record ReplaceLinkRequest(Integer expiresInDays) {}
  public record CreatedShare(
      UUID shareId, String token, String recipientName, String purpose, Instant expiresAt
  ) {}
  public record ShareSummary(
      UUID shareId, String recipientName, String purpose, String scope, String status,
      Instant consentedAt, Instant expiresAt, Instant revokedAt, Instant lastAccessedAt,
      long accessCount, BorrowerReview review, List<ReviewEventSummary> reviewHistory
  ) {}
  public record PublicShare(
      String recipientName, String purpose, String scope, Instant consentedAt,
      Instant expiresAt, JsonNode report, Instant publishedAt, LenderReview review
  ) {}
  public record UpdateReview(
      String status, String outcome, String borrowerMessage, String internalNote
  ) {}
  public record BorrowerResponseRequest(String response) {}
  public record BorrowerReview(
      String status, String outcome, String borrowerMessage, String borrowerResponse,
      Instant borrowerRespondedAt, Instant updatedAt, Instant completedAt
  ) {}
  public record LenderReview(
      String status, String outcome, String borrowerMessage, String borrowerResponse,
      Instant borrowerRespondedAt, String internalNote, Instant updatedAt, Instant completedAt
  ) {}
  public record ReviewEventSummary(
      String eventType, String fromStatus, String toStatus, String borrowerMessage,
      String borrowerResponse, Instant createdAt
  ) {}
  public record ShareAccess(UUID shareId, UUID borrowerId, UUID passportId) {}

  public static class ShareUnavailableException extends RuntimeException {
    public ShareUnavailableException(String message) { super(message); }
  }
}
