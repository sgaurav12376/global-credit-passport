package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.setu.SetuFinancialSummaryCalculator;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public final class SetuCashflowNormalizationAdapter
    implements NormalizationAdapter<
        SetuFinancialSummaryCalculator.FinancialSummary,
        GcpNormalized.CashflowDataset> {

    private final ObjectMapper objectMapper;

    public SetuCashflowNormalizationAdapter(
        ObjectMapper objectMapper
    ) {
        this.objectMapper = Objects.requireNonNull(objectMapper);
    }

    @Override
    public String adapterId() {
        return "setu-cashflow";
    }

    @Override
    public String adapterVersion() {
        return "0.1.0";
    }

    @Override
    public GcpNormalized.CashflowDataset normalize(
        SetuFinancialSummaryCalculator.FinancialSummary source,
        NormalizationContext context
    ) {
        Objects.requireNonNull(source);
        Objects.requireNonNull(context);

        if (!"IN".equals(context.countryCode())) {
            throw new IllegalArgumentException(
                "Setu pilot evidence must originate in India"
            );
        }

        if (!"INR".equals(source.currency())) {
            throw new IllegalArgumentException(
                "Unsupported Setu cashflow currency"
            );
        }

        if (!"GCP_SIMULATOR".equals(context.provider())
            || !"SETU_CASHFLOW_FIXTURE".equals(
                context.sourceSystem())) {

            throw new IllegalArgumentException(
                "Only synthetic Setu evidence is supported"
            );
        }

        List<String> fields = new ArrayList<>();

        if (source.analyzedTransactions() > 0) {
            fields.add("analyzedTransactions");
            add(fields, "coverageStart", source.coverageStart());
            add(fields, "coverageEnd", source.coverageEnd());
        }

        add(fields, "averageMonthlyDetectedIncome",
            source.averageMonthlyDetectedIncome());

        add(fields, "averageMonthlyOutflows",
            source.averageMonthlyOutflows());

        add(fields, "incomeStabilityPercent",
            source.incomeStabilityPercent());

        int completeness = Math.min(
            100,
            Math.round(fields.size() * 100f / 6f)
        );

        List<String> warnings =
            new ArrayList<>(source.warnings());

        warnings.add(
            "Synthetic Setu cashflow fixture; not verified "
            + "provider evidence or eligible for live lending"
        );

        warnings.add("Source currency: INR");

        if (source.completeMonthsAnalyzed() < 2) {
            completeness = Math.min(completeness, 50);

            warnings.add(
                "Fewer than two usable complete months"
            );
        }

        return new GcpNormalized.CashflowDataset(
            "GCP_CASHFLOW_V1",

            new GcpNormalized.Provenance(
                context.countryCode(),
                context.provider(),
                context.sourceSystem(),
                context.providerReference(),
                context.consentVersion(),
                context.consentedAt(),
                context.retrievedAt(),
                context.documentSha256(),
                adapterId(),
                adapterVersion()
            ),

            new GcpNormalized.CashflowMetrics(
                source.institutionConnections(),
                source.depositoryAccounts(),
                source.analyzedTransactions(),
                source.coverageStart(),
                source.coverageEnd(),
                source.completeMonthsAnalyzed(),
                source.averageMonthlyDetectedIncome(),
                source.averageMonthlyOutflows(),
                source.averageMonthlyDebtPayments(),
                source.averageMonthlySustainableNetCashflow(),
                source.incomeStabilityPercent()
            ),

            objectMapper.valueToTree(
                source.monthlyCashflow()
            ),

            new GcpNormalized.DataQuality(
                completeness,
                List.copyOf(fields),
                List.copyOf(warnings)
            )
        );
    }

    private void add(
        List<String> fields,
        String field,
        Object value
    ) {
        if (value != null) {
            fields.add(field);
        }
    }
}
