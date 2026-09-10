package com.synergyresources.gcp.passport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.synergyresources.gcp.passport.model.PassportOutput;
import com.synergyresources.gcp.passport.model.PassportShareGrant;
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
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class PassportShareService {
  public static final String SCOPE = "LENDER_RISK_REPORT_V1";
  public static final String CONSENT_VERSION = "GCP_LENDER_SHARE_CONSENT_V1";
  private static final SecureRandom RANDOM = new SecureRandom();

  private final PassportShareGrantRepo shareRepo;
  private final PassportRepo passportRepo;
  private final PassportOutputRepo outputRepo;
  private final ObjectMapper objectMapper;

  public PassportShareService(
      PassportShareGrantRepo shareRepo,
      PassportRepo passportRepo,
      PassportOutputRepo outputRepo,
      ObjectMapper objectMapper
  ) {
    this.shareRepo = shareRepo;
    this.passportRepo = passportRepo;
    this.outputRepo = outputRepo;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public CreatedShare create(UUID borrowerId, UUID passportId, CreateShare request) {
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
    String token = token();
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
    grant.setExpiresAt(now.plus(days, ChronoUnit.DAYS));
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

  @Transactional
  public ShareSummary revoke(UUID borrowerId, UUID passportId, UUID shareId) {
    PassportShareGrant grant = shareRepo.findByIdAndBorrowerId(shareId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Share not found"));
    if (!passportId.equals(grant.getPassportId())) {
      throw new IllegalArgumentException("Share not found");
    }
    if (grant.getRevokedAt() == null) grant.setRevokedAt(Instant.now());
    return summary(shareRepo.saveAndFlush(grant), Instant.now());
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
    shareRepo.save(grant);
    return new PublicShare(
        grant.getRecipientName(), grant.getPurpose(), grant.getScope(), grant.getConsentedAt(),
        grant.getExpiresAt(), redacted(output), output.getCreatedAt()
    );
  }

  private JsonNode redacted(PassportOutput output) {
    JsonNode source = output.getDocument();
    ObjectNode report = objectMapper.createObjectNode();
    report.put("schemaVersion", output.getSchemaVersion());
    report.put("passportId", output.getPassportId().toString());
    report.set("subject", source.path("subject").deepCopy());
    report.set("corridor", source.path("corridor").deepCopy());
    report.set("identityVerification", identitySummary(source.path("identityVerification")));
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
        grant.getLastAccessedAt(), grant.getAccessCount()
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
  public record CreatedShare(
      UUID shareId, String token, String recipientName, String purpose, Instant expiresAt
  ) {}
  public record ShareSummary(
      UUID shareId, String recipientName, String purpose, String scope, String status,
      Instant consentedAt, Instant expiresAt, Instant revokedAt, Instant lastAccessedAt,
      long accessCount
  ) {}
  public record PublicShare(
      String recipientName, String purpose, String scope, Instant consentedAt,
      Instant expiresAt, JsonNode report, Instant publishedAt
  ) {}

  public static class ShareUnavailableException extends RuntimeException {
    public ShareUnavailableException(String message) { super(message); }
  }
}
