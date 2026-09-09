package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.repo.NormalizedEvidenceRepo;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NormalizedEvidenceService {
  private final NormalizedEvidenceRepo repo;
  private final EvidenceCoverageCalculator coverageCalculator;
  private final ObjectMapper objectMapper;

  public NormalizedEvidenceService(
      NormalizedEvidenceRepo repo,
      EvidenceCoverageCalculator coverageCalculator,
      ObjectMapper objectMapper
  ) {
    this.repo = repo;
    this.coverageCalculator = coverageCalculator;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public NormalizedEvidence saveCredit(
      UUID borrowerId, UUID passportId, GcpNormalized.CreditDataset dataset
  ) {
    return save(borrowerId, passportId, "CREDIT", dataset.schemaVersion(),
        dataset.provenance(), dataset.dataQuality(), dataset);
  }

  @Transactional
  public NormalizedEvidence saveCashflow(
      UUID borrowerId, UUID passportId, GcpNormalized.CashflowDataset dataset
  ) {
    return save(borrowerId, passportId, "CASHFLOW", dataset.schemaVersion(),
        dataset.provenance(), dataset.dataQuality(), dataset);
  }

  @Transactional
  public NormalizedEvidence saveIdentity(
      UUID borrowerId, UUID passportId, GcpNormalized.IdentityDataset dataset
  ) {
    return save(borrowerId, passportId, "IDENTITY", dataset.schemaVersion(),
        dataset.provenance(), dataset.dataQuality(), dataset);
  }

  @Transactional(readOnly = true)
  public List<NormalizedEvidence> evidence(UUID borrowerId, UUID passportId) {
    return repo.findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId);
  }

  @Transactional(readOnly = true)
  public EvidenceCoverage coverage(UUID borrowerId, UUID passportId) {
    return coverageCalculator.calculate(evidence(borrowerId, passportId));
  }

  private NormalizedEvidence save(
      UUID borrowerId, UUID passportId, String domain, String schemaVersion,
      GcpNormalized.Provenance provenance, GcpNormalized.DataQuality quality, Object dataset
  ) {
    NormalizedEvidence evidence = new NormalizedEvidence();
    evidence.setBorrowerId(borrowerId);
    evidence.setPassportId(passportId);
    evidence.setDomain(domain);
    evidence.setCountryCode(provenance.countryCode());
    evidence.setProvider(provenance.provider());
    evidence.setSourceSystem(provenance.sourceSystem());
    evidence.setProviderReference(provenance.providerReference());
    evidence.setSchemaVersion(schemaVersion);
    evidence.setAdapterId(provenance.adapterId());
    evidence.setAdapterVersion(provenance.adapterVersion());
    evidence.setCompletenessPercent(quality.completenessPercent());
    evidence.setRetrievedAt(provenance.retrievedAt());
    evidence.setPayload(objectMapper.valueToTree(dataset));
    return repo.saveAndFlush(evidence);
  }
}
