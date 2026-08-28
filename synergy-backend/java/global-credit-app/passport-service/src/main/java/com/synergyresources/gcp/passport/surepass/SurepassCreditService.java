package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SurepassCreditService {
  private final SurepassClient surepassClient;
  private final IndianCreditNormalizer normalizer;
  private final PassportRepo passportRepo;
  private final SurepassCreditReportRepo reportRepo;
  private final ObjectMapper objectMapper;
  private final SurepassReportDocumentStore documentStore;
  private static final String CONSENT_VERSION = "surepass-india-credit-v1";

  public SurepassCreditService(
      SurepassClient surepassClient,
      IndianCreditNormalizer normalizer,
      PassportRepo passportRepo,
      SurepassCreditReportRepo reportRepo,
      ObjectMapper objectMapper,
      SurepassReportDocumentStore documentStore
  ) {
    this.surepassClient = surepassClient;
    this.normalizer = normalizer;
    this.passportRepo = passportRepo;
    this.reportRepo = reportRepo;
    this.objectMapper = objectMapper;
    this.documentStore = documentStore;
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
    return store(borrowerId, passportId, report, null);
  }

  private StoredCreditReport store(
      UUID borrowerId,
      UUID passportId,
      NormalizedCreditReport report,
      SurepassReportDocumentStore.StoredDocument document
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
    entity.setConsentVersion(CONSENT_VERSION);
    entity.setConsentedAt(Instant.now());
    if (document != null) {
      entity.setDocumentStorageKey(document.storageKey());
      entity.setDocumentContentType(document.contentType());
      entity.setDocumentSha256(document.sha256());
      entity.setDocumentSizeBytes(document.sizeBytes());
    }
    return result(reportRepo.save(entity));
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
}
