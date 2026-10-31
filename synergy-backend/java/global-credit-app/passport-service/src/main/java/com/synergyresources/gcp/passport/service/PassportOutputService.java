package com.synergyresources.gcp.passport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PassportOutput;
import com.synergyresources.gcp.passport.model.PlaidFinancialSnapshot;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.model.EntrustVerification;
import com.synergyresources.gcp.passport.normalization.NormalizedEvidenceSyncService;
import com.synergyresources.gcp.passport.normalization.CreditBureauReconciliationService;
import com.synergyresources.gcp.passport.risk.DeterministicRiskAssessmentService;
import com.synergyresources.gcp.passport.repo.PassportOutputRepo;
import com.synergyresources.gcp.passport.repo.PlaidFinancialSnapshotRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PassportOutputService {
  public static final String SCHEMA_VERSION = "GCP_PILOT_V1";

  private final PassportOutputRepo outputRepo;
  private final PlaidFinancialSnapshotRepo plaidSnapshotRepo;
  private final SurepassCreditReportRepo surepassReportRepo;
  private final NormalizedEvidenceSyncService evidenceSyncService;
  private final CreditBureauReconciliationService reconciliationService;
  private final DeterministicRiskAssessmentService riskAssessmentService;
  private final ObjectMapper objectMapper;

  @Value("${plaid.environment:sandbox}")
  private String plaidEnvironment = "sandbox";

  @Value("${finpass.data-mode:test}")
  private String finpassDataMode = "test";

  public PassportOutputService(
      PassportOutputRepo outputRepo,
      PlaidFinancialSnapshotRepo plaidSnapshotRepo,
      SurepassCreditReportRepo surepassReportRepo,
      NormalizedEvidenceSyncService evidenceSyncService,
      CreditBureauReconciliationService reconciliationService,
      DeterministicRiskAssessmentService riskAssessmentService,
      ObjectMapper objectMapper
  ) {
    this.outputRepo = outputRepo;
    this.plaidSnapshotRepo = plaidSnapshotRepo;
    this.surepassReportRepo = surepassReportRepo;
    this.evidenceSyncService = evidenceSyncService;
    this.reconciliationService = reconciliationService;
    this.riskAssessmentService = riskAssessmentService;
    this.objectMapper = objectMapper;
  }

  public PassportOutput create(
      UUID borrowerId,
      Passport passport,
      boolean sandboxIdentityPolicy,
      EntrustVerification entrust
  ) {
    PlaidFinancialSnapshot plaid = plaidSnapshotRepo
        .findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passport.getId())
        .orElse(null);
    List<SurepassCreditReport> surepassReports = surepassReportRepo
        .findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passport.getId())
        .stream().filter(report -> "SUCCESS".equals(report.getStatus())).toList();
    boolean providerCreditAvailable = surepassReports.stream()
        .anyMatch(report -> !isSimulatedCredit(report));
    List<SurepassCreditReport> creditReportsForOutput = providerCreditAvailable
        ? surepassReports.stream().filter(report -> !isSimulatedCredit(report)).toList()
        : surepassReports;
    SurepassCreditReport surepass = creditReportsForOutput.isEmpty()
        ? null : creditReportsForOutput.get(0);
    boolean simulatedCredit = !creditReportsForOutput.isEmpty()
        && creditReportsForOutput.stream().allMatch(this::isSimulatedCredit);
    boolean providerTestCredit = !simulatedCredit
        && "test".equalsIgnoreCase(finpassDataMode)
        && creditReportsForOutput.stream().anyMatch(report -> report.getConsentVersion() != null
            && report.getConsentVersion().startsWith("finpass-"));
    var normalized = evidenceSyncService.synchronize(
        borrowerId, passport, plaid, creditReportsForOutput, entrust
    );

    ObjectNode document = objectMapper.createObjectNode();
    document.put("schemaVersion", SCHEMA_VERSION);
    document.put("passportId", passport.getId().toString());
    document.put("generatedAt", Instant.now().toString());
    document.put("status", simulatedCredit ? "PILOT_SIMULATION_READY" : "PILOT_READY");

    ObjectNode subject = document.putObject("subject");
    subject.put("fullName", passport.getFullName());
    subject.put("dateOfBirth", passport.getDob().toString());

    ObjectNode corridor = document.putObject("corridor");
    corridor.put("originCountry", passport.getOriginCountry());
    corridor.put("destinationCountry", passport.getDestCountry());
    corridor.put("purpose", passport.getPurpose());

    ObjectNode identity = document.putObject("identityVerification");
    identity.put("provider", "ENTRUST");
    identity.put("status", entrust == null ? passport.getIdentityStatus() : entrust.getStatus());
    identity.put("passportStatus", passport.getIdentityStatus());
    if (entrust != null) {
      identity.put("verificationId", entrust.getId().toString());
      identity.put("workflowRunId", entrust.getWorkflowRunId());
      identity.put("workflowId", entrust.getWorkflowId());
      identity.put("startedAt", entrust.getStartedAt().toString());
      if (entrust.getCompletedAt() != null) {
        identity.put("completedAt", entrust.getCompletedAt().toString());
      }
    }
    identity.put("sandboxSimulation", sandboxIdentityPolicy);
    identity.put("blocking", !sandboxIdentityPolicy);
    identity.put("approvalRequiredForPilot", !sandboxIdentityPolicy);

    ObjectNode sources = document.putObject("verifiedSources");
    if (plaid != null) {
      ObjectNode bank = sources.putObject("openBanking");
      bank.put("provider", "PLAID");
      bank.put("snapshotId", plaid.getId().toString());
      bank.put("methodologyVersion", plaid.getMethodologyVersion());
      bank.put("capturedAt", plaid.getCreatedAt().toString());
      bank.set("summary", plaid.getSummary());
      bank.set("sourceItemIds", plaid.getSourceItemIds());
    } else {
      sources.putNull("openBanking");
    }
    if (surepass != null) {
      ObjectNode credit = sources.putObject("creditBureau");
      credit.put("provider", simulatedCredit ? "GCP_SIMULATOR" : "SUREPASS");
      credit.put("simulated", simulatedCredit);
      credit.put("reportId", surepass.getId().toString());
      credit.put("bureau", surepass.getBureau());
      credit.put("providerReference", surepass.getProviderReference());
      credit.put("capturedAt", surepass.getCreatedAt().toString());
      credit.set("normalizedReport", surepass.getNormalizedReport());
      ObjectNode provenance = credit.putObject("provenance");
      provenance.put("consentVersion", surepass.getConsentVersion());
      provenance.put("consentedAt", surepass.getConsentedAt().toString());
      if (surepass.getDocumentSha256() != null) {
        provenance.put("documentSha256", surepass.getDocumentSha256());
      }
    } else {
      sources.putNull("creditBureau");
    }

    ObjectNode coverage = document.putObject("coverage");
    coverage.put("identityStatusAvailable", entrust != null);
    coverage.put("openBankingAvailable", plaid != null);
    coverage.put("openBankingSandbox", plaid != null && "sandbox".equalsIgnoreCase(plaidEnvironment));
    coverage.put("creditBureauAvailable", surepass != null);
    coverage.put("creditBureauSimulated", simulatedCredit);
    coverage.put("sourceCount", (plaid == null ? 0 : 1) + (surepass == null ? 0 : 1));

    ObjectNode evidenceEnvironment = document.putObject("evidenceEnvironment");
    evidenceEnvironment.put("creditSimulated", simulatedCredit);
    evidenceEnvironment.put("creditProviderTest", providerTestCredit);
    evidenceEnvironment.put("openBankingSandbox",
        plaid != null && "sandbox".equalsIgnoreCase(plaidEnvironment));
    evidenceEnvironment.put("identitySandbox", sandboxIdentityPolicy);

    document.set("evidenceCoverage", objectMapper.valueToTree(normalized.coverage()));
    var reconciliation = reconciliationService.reconcile(normalized.evidence());
    document.set("creditReconciliation", objectMapper.valueToTree(reconciliation));
    document.set("riskAssessment", objectMapper.valueToTree(
        riskAssessmentService.assess(
            normalized.evidence(), normalized.coverage(), reconciliation
        )
    ));
    var normalizedEvidence = document.putArray("normalizedEvidence");
    normalized.evidence().forEach(item -> {
      ObjectNode node = normalizedEvidence.addObject();
      if (item.getId() != null) node.put("evidenceId", item.getId().toString());
      node.put("domain", item.getDomain());
      node.put("countryCode", item.getCountryCode());
      node.put("provider", item.getProvider());
      node.put("sourceSystem", item.getSourceSystem());
      node.put("schemaVersion", item.getSchemaVersion());
      node.put("completenessPercent", item.getCompletenessPercent());
      node.set("dataset", item.getPayload());
    });

    PassportOutput output = new PassportOutput();
    output.setBorrowerId(borrowerId);
    output.setPassportId(passport.getId());
    output.setSchemaVersion(SCHEMA_VERSION);
    output.setDocument(document);
    return outputRepo.saveAndFlush(output);
  }

  public PassportOutput latest(UUID borrowerId, UUID passportId) {
    return outputRepo.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(
        borrowerId, passportId
    ).orElseThrow(() -> new IllegalArgumentException("Passport output not found"));
  }

  private boolean isSimulatedCredit(SurepassCreditReport report) {
    return "CIBIL_SIMULATED".equals(report.getBureau())
        || (report.getConsentVersion() != null
            && report.getConsentVersion().startsWith("gcp-local-"));
  }

  public record View(UUID outputId, UUID passportId, String schemaVersion,
                     JsonNode document, Instant createdAt) {
    public static View from(PassportOutput output) {
      return new View(output.getId(), output.getPassportId(), output.getSchemaVersion(),
          output.getDocument(), output.getCreatedAt());
    }
  }
}
