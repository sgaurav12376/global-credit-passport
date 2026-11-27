package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.repo.NormalizedEvidenceRepo;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SetuCashflowPersistenceGuardTest {
    private final ObjectMapper json = new ObjectMapper();
    private final NormalizedEvidenceRepo repo = mock(NormalizedEvidenceRepo.class);
    private final NormalizedEvidenceService service = new NormalizedEvidenceService(
        repo, new EvidenceCoverageCalculator(), json);

    private GcpNormalized.CashflowDataset dataset(String provider, String source,
            String adapter, GcpNormalized.EvidenceEnvironment environment) {
        return new GcpNormalized.CashflowDataset("GCP_CASHFLOW_V1",
            new GcpNormalized.Provenance("IN", provider, source, "test-only", "test-only",
                null, Instant.EPOCH, null, adapter, "0.2.0"),
            null, json.createArrayNode(), new GcpNormalized.DataQuality(0, List.of(), List.of()),
            "INR", environment);
    }

    private void blocked(GcpNormalized.CashflowDataset dataset) {
        assertThrows(IllegalArgumentException.class,
            () -> service.saveCashflow(UUID.randomUUID(), UUID.randomUUID(), dataset));
        verifyNoInteractions(repo);
    }

    @Test void rejectsSetuFixtureBeforeAnyDatabaseAccess() {
        blocked(dataset("GCP_SIMULATOR", "SETU_CASHFLOW_FIXTURE", "setu-cashflow",
            GcpNormalized.EvidenceEnvironment.SYNTHETIC));
    }

    @Test void rejectsSetuEvenIfMarkedProduction() {
        blocked(dataset("SETU", "ACCOUNT_AGGREGATOR", "setu-cashflow",
            GcpNormalized.EvidenceEnvironment.PRODUCTION));
    }

    @Test void rejectsSyntheticCashflowFromAnyProvider() {
        blocked(dataset("PLAID", "OPEN_BANKING", "plaid-cashflow",
            GcpNormalized.EvidenceEnvironment.SYNTHETIC));
    }

    @Test void rejectsLegacySetuFixtureWithoutEnvironmentMetadata() {
        blocked(dataset("GCP_SIMULATOR", "SETU_CASHFLOW_FIXTURE", "legacy-adapter",
            GcpNormalized.EvidenceEnvironment.UNKNOWN));
    }
}
