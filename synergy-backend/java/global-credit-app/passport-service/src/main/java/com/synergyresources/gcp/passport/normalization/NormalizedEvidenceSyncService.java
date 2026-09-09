package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.EntrustVerification;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PlaidFinancialSnapshot;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NormalizedEvidenceSyncService {
  private final CreditNormalizationAdapter creditAdapter;
  private final PlaidCashflowNormalizationAdapter cashflowAdapter;
  private final EntrustIdentityNormalizationAdapter identityAdapter;
  private final NormalizedEvidenceService evidenceService;
  private final ObjectMapper objectMapper;

  public NormalizedEvidenceSyncService(
      CreditNormalizationAdapter creditAdapter,
      PlaidCashflowNormalizationAdapter cashflowAdapter,
      EntrustIdentityNormalizationAdapter identityAdapter,
      NormalizedEvidenceService evidenceService,
      ObjectMapper objectMapper
  ) {
    this.creditAdapter = creditAdapter;
    this.cashflowAdapter = cashflowAdapter;
    this.identityAdapter = identityAdapter;
    this.evidenceService = evidenceService;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public SyncResult synchronize(
      UUID borrowerId,
      Passport passport,
      PlaidFinancialSnapshot plaid,
      List<SurepassCreditReport> creditReports,
      EntrustVerification entrust
  ) {
    if (plaid != null) persistCashflow(borrowerId, passport, plaid);
    creditReports.stream()
        .filter(report -> "SUCCESS".equals(report.getStatus()))
        .forEach(report -> persistCredit(borrowerId, passport, report));
    if (entrust != null) persistIdentity(borrowerId, passport, entrust);

    List<NormalizedEvidence> evidence = evidenceService.evidence(borrowerId, passport.getId());
    return new SyncResult(evidence, evidenceService.coverage(borrowerId, passport.getId()));
  }

  private void persistCashflow(
      UUID borrowerId, Passport passport, PlaidFinancialSnapshot source
  ) {
    Instant retrievedAt = time(source.getCreatedAt());
    var context = new NormalizationContext(
        country(passport.getResidenceCountry(), passport.getDestCountry()),
        "PLAID", "OPEN_BANKING", reference(source.getId()),
        "plaid-link-v1", retrievedAt, retrievedAt, null
    );
    evidenceService.saveCashflow(
        borrowerId, passport.getId(), cashflowAdapter.normalize(source.getSummary(), context)
    );
  }

  private void persistCredit(
      UUID borrowerId, Passport passport, SurepassCreditReport source
  ) {
    NormalizedCreditReport report = objectMapper.convertValue(
        source.getNormalizedReport(), NormalizedCreditReport.class
    );
    Instant retrievedAt = time(source.getCreatedAt());
    var context = new NormalizationContext(
        country(passport.getOriginCountry(), passport.getResidenceCountry()),
        "SUREPASS", source.getBureau(), source.getProviderReference(),
        source.getConsentVersion(), source.getConsentedAt(), retrievedAt,
        source.getDocumentSha256()
    );
    evidenceService.saveCredit(
        borrowerId, passport.getId(), creditAdapter.normalize(report, context)
    );
  }

  private void persistIdentity(
      UUID borrowerId, Passport passport, EntrustVerification source
  ) {
    Instant retrievedAt = time(source.getUpdatedAt());
    var context = new NormalizationContext(
        country(passport.getResidenceCountry(), passport.getOriginCountry()),
        "ENTRUST", "IDENTITY_VERIFICATION", source.getWorkflowRunId(),
        "entrust-idv-v1", source.getStartedAt(), retrievedAt, null
    );
    evidenceService.saveIdentity(
        borrowerId, passport.getId(), identityAdapter.normalize(source, context)
    );
  }

  private Instant time(Instant value) { return value == null ? Instant.now() : value; }
  private String reference(UUID value) { return value == null ? "snapshot-pending" : value.toString(); }
  private String country(String preferred, String fallback) {
    return preferred == null || preferred.isBlank() ? fallback : preferred;
  }

  public record SyncResult(List<NormalizedEvidence> evidence, EvidenceCoverage coverage) {}
}
