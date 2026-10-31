package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class SurepassCreditService {
  private final SurepassClient surepassClient;
  private final IndianCreditNormalizer normalizer;
  private final PassportRepo passportRepo;
  private final SurepassCreditReportRepo reportRepo;
  private final ObjectMapper objectMapper;
  private final SurepassReportDocumentStore documentStore;
  private final FinpassMultiBureauClient multiBureauClient;
  private final SurepassMultiBureauNormalizer multiBureauNormalizer;
  private static final String CONSENT_VERSION = "surepass-india-credit-v1";
  private static final String SIMULATION_CONSENT_VERSION = "gcp-local-credit-simulation-v1";

  public SurepassCreditService(
      SurepassClient surepassClient,
      IndianCreditNormalizer normalizer,
      PassportRepo passportRepo,
      SurepassCreditReportRepo reportRepo,
      ObjectMapper objectMapper,
      SurepassReportDocumentStore documentStore,
      FinpassMultiBureauClient multiBureauClient,
      SurepassMultiBureauNormalizer multiBureauNormalizer
  ) {
    this.surepassClient = surepassClient;
    this.normalizer = normalizer;
    this.passportRepo = passportRepo;
    this.reportRepo = reportRepo;
    this.objectMapper = objectMapper;
    this.documentStore = documentStore;
    this.multiBureauClient = multiBureauClient;
    this.multiBureauNormalizer = multiBureauNormalizer;
  }

  public MultiBureauResult fetchMultiBureau(
      UUID borrowerId, UUID passportId, FinpassMultiBureauClient.Request request
  ) {
    requireOwnedPassport(borrowerId, passportId);
    return storeMultiBureauResponse(
        borrowerId, passportId, multiBureauClient.fetch(request), "finpass-multi-bureau-v1"
    );
  }

  public MultiBureauResult simulateMultiBureau(
      UUID borrowerId, UUID passportId, String requestedScenario
  ) {
    requireOwnedPassport(borrowerId, passportId);
    String scenario = requestedScenario == null
        ? "COMPLETE" : requestedScenario.trim().toUpperCase(Locale.ROOT);
    if (!scenario.equals("COMPLETE") && !scenario.equals("PARTIAL")) {
      throw new IllegalArgumentException("Multi-bureau scenario must be COMPLETE or PARTIAL");
    }
    try (var input = new ClassPathResource(
        "fixtures/finpass-multibureau-synthetic.json"
    ).getInputStream()) {
      JsonNode fixture = objectMapper.readTree(input);
      ObjectNode envelope = (ObjectNode) fixture.path("data");
      String runId = UUID.randomUUID().toString();
      envelope.put("doc_id", "local-multibureau-" + runId);
      for (String bureau : List.of("equifax", "experian", "cibil", "crif")) {
        JsonNode data = envelope.path("results").path(bureau).path("data");
        if (data instanceof ObjectNode object) {
          object.put("client_id", "local-" + bureau + "-" + runId);
        }
      }
      if (scenario.equals("PARTIAL")) {
        ObjectNode cibil = (ObjectNode) envelope.path("results").path("cibil");
        cibil.put("success", false);
        cibil.put("status_code", 404);
        cibil.put("message", "Synthetic no-hit result for partial-success testing");
        cibil.remove("data");
      }
      return storeMultiBureauResponse(
          borrowerId, passportId, fixture, "gcp-local-multi-bureau-fixture-v1"
      );
    } catch (java.io.IOException exception) {
      throw new IllegalStateException("Local multi-bureau fixture could not be loaded", exception);
    }
  }

  public MultiBureauResult importFinpassTestResponse(
      UUID borrowerId, UUID passportId, JsonNode response
  ) {
    requireOwnedPassport(borrowerId, passportId);
    if (response == null || response.isNull() || response.isMissingNode()) {
      throw new IllegalArgumentException("Finpass response JSON is required");
    }
    return storeMultiBureauResponse(
        borrowerId, passportId, response, "finpass-multi-bureau-imported-test-v1"
    );
  }

  private MultiBureauResult storeMultiBureauResponse(
      UUID borrowerId, UUID passportId, JsonNode response, String consentVersion
  ) {
    var batch = multiBureauNormalizer.normalizeBatch(response);
    List<StoredCreditReport> stored = batch.reports().stream()
        .map(report -> store(borrowerId, passportId, report, null, consentVersion))
        .toList();
    if (stored.isEmpty()) {
      throw new IllegalStateException("No bureau returned usable structured credit information");
    }
    return new MultiBureauResult(batch.providerReference(), stored, batch.outcomes());
  }

  public StoredCreditReport fetchCrif(
      UUID borrowerId, UUID passportId, SurepassClient.CrifRequest request
  ) {
    requireOwnedPassport(borrowerId, passportId);
    return store(borrowerId, passportId,
        normalizer.normalizeCrif(surepassClient.fetchCrifReport(request)));
  }

  public StoredCreditReport fetchExperian(
      UUID borrowerId, UUID passportId, SurepassClient.ExperianRequest request
  ) {
    requireOwnedPassport(borrowerId, passportId);
    return store(borrowerId, passportId,
        normalizer.normalizeExperian(surepassClient.fetchExperianReport(request)));
  }

  public StoredCreditReport fetchCibilPdf(
      UUID borrowerId, UUID passportId, SurepassClient.CibilPdfRequest request
  ) {
    requireOwnedPassport(borrowerId, passportId);
    var response = surepassClient.fetchCibilPdfReport(request);
    var data = response.path("data");
    var document = documentStore.savePdf(
        borrowerId,
        passportId,
        data.path("credit_report_base64").asText(null),
        data.path("credit_report_link").asText(null)
    );
    try {
      return store(
          borrowerId,
          passportId,
          normalizer.normalizeCibilPdf(response),
          document
      );
    } catch (RuntimeException exception) {
      documentStore.deleteQuietly(document.storageKey());
      throw exception;
    }
  }

  public StoredCreditReport fetchCibil(
      UUID borrowerId, UUID passportId, SurepassClient.CibilPdfRequest request
  ) {
    requireOwnedPassport(borrowerId, passportId);
    return store(
        borrowerId,
        passportId,
        normalizer.normalizeCibil(surepassClient.fetchCibilReport(request))
    );
  }

  public StoredCreditReport simulateCibil(
      UUID borrowerId, UUID passportId, String requestedScenario
  ) {
    requireOwnedPassport(borrowerId, passportId);
    String scenario = requestedScenario == null
        ? "BALANCED"
        : requestedScenario.trim().toUpperCase(Locale.ROOT);
    NormalizedCreditReport report = switch (scenario) {
      case "STRONG" -> simulatedReport(
          scenario, 790, 3, 2, 0, new BigDecimal("20000"),
          new BigDecimal("200000"), 120, 1, 0, 0
      );
      case "BALANCED" -> simulatedReport(
          scenario, 710, 4, 3, 1, new BigDecimal("120000"),
          new BigDecimal("300000"), 48, 3, 30, 0
      );
      case "HIGH_RISK" -> simulatedReport(
          scenario, 580, 5, 4, 2, new BigDecimal("280000"),
          new BigDecimal("350000"), 24, 8, 90, 1
      );
      default -> throw new IllegalArgumentException(
          "Simulation scenario must be STRONG, BALANCED, or HIGH_RISK"
      );
    };
    return store(borrowerId, passportId, report, null, SIMULATION_CONSENT_VERSION);
  }

  public StoredCreditReport latest(UUID borrowerId, UUID passportId) {
    requireOwnedPassport(borrowerId, passportId);
    return reportRepo.findFirstByBorrowerIdAndPassportIdAndStatusOrderByCreatedAtDesc(
        borrowerId, passportId, "SUCCESS"
    ).map(this::result).orElseThrow(() -> new IllegalArgumentException(
        "No Surepass credit report exists for this passport"
    ));
  }

  public List<StoredCreditReport> history(UUID borrowerId, UUID passportId) {
    requireOwnedPassport(borrowerId, passportId);
    return reportRepo.findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
        borrowerId, passportId
    ).stream().map(this::result).toList();
  }

  private StoredCreditReport store(
      UUID borrowerId, UUID passportId, NormalizedCreditReport report
  ) {
    return store(borrowerId, passportId, report, null, CONSENT_VERSION);
  }

  private StoredCreditReport store(
      UUID borrowerId,
      UUID passportId,
      NormalizedCreditReport report,
      SurepassReportDocumentStore.StoredDocument document
  ) {
    return store(borrowerId, passportId, report, document, CONSENT_VERSION);
  }

  private StoredCreditReport store(
      UUID borrowerId,
      UUID passportId,
      NormalizedCreditReport report,
      SurepassReportDocumentStore.StoredDocument document,
      String consentVersion
  ) {
    if (report.providerReference() == null || report.providerReference().isBlank()) {
      throw new IllegalStateException("Surepass response did not include a provider reference");
    }
    SurepassCreditReport entity = new SurepassCreditReport();
    entity.setBorrowerId(borrowerId);
    entity.setPassportId(passportId);
    entity.setBureau(report.bureau());
    entity.setProviderReference(report.providerReference());
    entity.setCreditScore(report.creditScore());
    entity.setNormalizedReport(objectMapper.valueToTree(report));
    entity.setConsentVersion(consentVersion);
    entity.setConsentedAt(Instant.now());
    if (document != null) {
      entity.setDocumentStorageKey(document.storageKey());
      entity.setDocumentContentType(document.contentType());
      entity.setDocumentSha256(document.sha256());
      entity.setDocumentSizeBytes(document.sizeBytes());
    }
    return result(reportRepo.save(entity));
  }

  private NormalizedCreditReport simulatedReport(
      String scenario,
      int score,
      int totalAccounts,
      int activeAccounts,
      int overdueAccounts,
      BigDecimal balance,
      BigDecimal sanctioned,
      int historyMonths,
      int enquiries,
      int maximumDpd,
      int writtenOffAccounts
  ) {
    var tradeline = new NormalizedCreditReport.Tradeline(
        "****SIM1", "Credit Card", "Active", balance, sanctioned,
        overdueAccounts > 0 ? new BigDecimal("5000") : BigDecimal.ZERO,
        writtenOffAccounts > 0 ? new BigDecimal("10000") : BigDecimal.ZERO,
        maximumDpd, "2022-01-01", "2026-09-01"
    );
    return new NormalizedCreditReport(
        "CIBIL_SIMULATED",
        "simulated-cibil-" + scenario.toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID(),
        score,
        300,
        900,
        List.of("LOCAL_SIMULATION_" + scenario),
        new NormalizedCreditReport.Summary(
            totalAccounts, activeAccounts, totalAccounts - activeAccounts,
            overdueAccounts, 1, Math.max(0, totalAccounts - 1), balance,
            sanctioned, historyMonths, enquiries, maximumDpd, writtenOffAccounts
        ),
        List.of(tradeline),
        List.of("SIMULATED_LOCAL_DEVELOPMENT_DATA_NOT_BUREAU_VERIFIED")
    );
  }

  public DocumentDownload document(UUID borrowerId, UUID reportId) {
    SurepassCreditReport report = reportRepo.findByIdAndBorrowerId(reportId, borrowerId)
        .orElseThrow(() -> new IllegalArgumentException("Credit report was not found"));
    if (report.getDocumentStorageKey() == null) {
      throw new IllegalArgumentException("This credit report does not include a PDF document");
    }
    byte[] content = documentStore.read(report.getDocumentStorageKey());
    return new DocumentDownload(
        content,
        "cibil-credit-report-" + report.getId() + ".pdf",
        report.getDocumentContentType() == null
            ? "application/pdf"
            : report.getDocumentContentType()
    );
  }

  private void requireOwnedPassport(UUID borrowerId, UUID passportId) {
    passportRepo.findByIdAndUserId(passportId, borrowerId).orElseThrow(
        () -> new IllegalArgumentException("Passport not found for the current borrower")
    );
  }

  private StoredCreditReport result(SurepassCreditReport entity) {
    return new StoredCreditReport(
        entity.getId(), entity.getPassportId(), entity.getBureau(),
        entity.getNormalizedReport(), entity.getDocumentStorageKey() != null,
        entity.getDocumentSizeBytes(), entity.getInheritedFromReportId(),
        entity.getConsentedAt(), entity.getCreatedAt()
    );
  }

  public record StoredCreditReport(
      UUID reportId,
      UUID passportId,
      String bureau,
      com.fasterxml.jackson.databind.JsonNode normalizedReport,
      boolean documentAvailable,
      Long documentSizeBytes,
      UUID inheritedFromReportId,
      Instant consentedAt,
      Instant createdAt
  ) {
  }

  public record DocumentDownload(byte[] content, String filename, String contentType) {
  }

  public record MultiBureauResult(
      String providerReference,
      List<StoredCreditReport> reports,
      List<SurepassMultiBureauNormalizer.BureauOutcome> outcomes
  ) {
  }
}
