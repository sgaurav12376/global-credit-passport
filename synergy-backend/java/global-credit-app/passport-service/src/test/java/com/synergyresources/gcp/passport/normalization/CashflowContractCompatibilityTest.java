package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CashflowContractCompatibilityTest {

    private final ObjectMapper json =
        new ObjectMapper().findAndRegisterModules();

    @Test
    void legacyConstructorRemainsSupported() {

        var dataset = new GcpNormalized.CashflowDataset(
            "GCP_CASHFLOW_V1",
            null,
            null,
            json.createArrayNode(),
            null
        );

        assertNull(dataset.currencyCode());

        assertEquals(
            GcpNormalized.EvidenceEnvironment.UNKNOWN,
            dataset.evidenceEnvironment()
        );
    }

    @Test
    void historicalJsonWithoutMetadataRemainsReadable()
            throws Exception {

        String historical = """
            {
              "schemaVersion": "GCP_CASHFLOW_V1",
              "monthlyCashflow": []
            }
            """;

        var dataset = json.readValue(
            historical,
            GcpNormalized.CashflowDataset.class
        );

        assertEquals(
            "GCP_CASHFLOW_V1",
            dataset.schemaVersion()
        );

        assertNull(dataset.currencyCode());

        assertEquals(
            GcpNormalized.EvidenceEnvironment.UNKNOWN,
            dataset.evidenceEnvironment()
        );
    }

    @Test
    void supportsExplicitUsdMetadata() {

        var dataset = new GcpNormalized.CashflowDataset(
            "GCP_CASHFLOW_V1",
            null,
            null,
            json.createArrayNode(),
            null,
            "USD",
            GcpNormalized.EvidenceEnvironment.SANDBOX
        );

        assertEquals("USD", dataset.currencyCode());

        assertEquals(
            GcpNormalized.EvidenceEnvironment.SANDBOX,
            dataset.evidenceEnvironment()
        );
    }

    @Test
    void rejectsInvalidCurrencyCodes() {

        assertThrows(
            IllegalArgumentException.class,
            () -> new GcpNormalized.CashflowDataset(
                "GCP_CASHFLOW_V1",
                null,
                null,
                json.createArrayNode(),
                null,
                "INVALID",
                GcpNormalized.EvidenceEnvironment.SYNTHETIC
            )
        );
    }

    @Test
    void missingEnvironmentIsNeverTreatedAsProduction() {

        var dataset = new GcpNormalized.CashflowDataset(
            "GCP_CASHFLOW_V1",
            null,
            null,
            json.createArrayNode(),
            null,
            "INR",
            null
        );

        assertEquals(
            GcpNormalized.EvidenceEnvironment.UNKNOWN,
            dataset.evidenceEnvironment()
        );
    }
}
