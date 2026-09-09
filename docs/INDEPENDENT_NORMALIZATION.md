# Independent GCP normalization

## Architectural rule

Provider payloads never enter scoring or lender output directly. Each source is normalized
independently into a versioned GCP dataset. An unavailable source does not prevent other
adapters from producing valid datasets.

```text
Provider payload -> provider/country parser -> GCP_*_V1 -> risk dimensions -> confidence
```

## Versioned contracts

- `GCP_CREDIT_V1`: bureau score, summary, accounts, factors, quality and provenance.
- `GCP_CASHFLOW_V1`: coverage, income, outflows, debt payments, net cash flow and stability.
- `GCP_IDENTITY_V1`: provider status, verified flag, workflow reference and provenance.

Every dataset carries country, provider, source system, consent evidence, retrieval time,
document hash when available, adapter ID/version, completeness and warnings.

## Adapter rules

1. Adapters must not call one another.
2. Missing values remain missing; they are never converted to zero.
3. Direct identifiers are excluded and account numbers are masked.
4. Native scores and ranges are preserved; bureau scores are not averaged.
5. Provider-specific fields cannot leak into the future scoring engine.
6. Scoring may use any sufficient combination of normalized datasets, while confidence
   separately reflects coverage, recency, completeness and consistency.

## Current pilot adapters

- India credit: CIBIL, Experian, CRIF High Mark and Equifax through Surepass structures.
- US cash flow: Plaid financial snapshots.
- Identity: Entrust verification status.

The multi-bureau Surepass normalizer accepts partial success: each successful bureau is
returned independently, and an unavailable bureau is skipped without discarding the others.

## Persistence and evidence coverage

Normalized datasets are stored append-only in `normalized_evidence`. Each row retains its domain,
country, provider, source system, schema and adapter versions, retrieval time, completeness, and
the complete normalized JSON payload. Multiple bureaus and repeated collections remain separate
evidence records for audit and later reconciliation.

`EvidenceCoverageCalculator` evaluates the best available quality in each independent domain:

- identity: 20%
- credit: 45%
- cash flow: 35%

Multiple providers improve evidence breadth but do not double-count a domain's weight. Identity
alone never qualifies as risk evidence. The initial minimum for a risk assessment is 35% coverage
with at least one credit or cash-flow dataset. This eligibility rule is separate from the future
risk score and confidence calculation.

## Next increment

When unified output is generated, `NormalizedEvidenceSyncService` synchronizes every successful
bureau report plus the latest cash-flow snapshot and identity-verification result. Synchronization
is idempotent by source reference and schema version. The output exposes both `evidenceCoverage`
and the versioned `normalizedEvidence` datasets. A sandbox identity decline remains recorded but
does not become an Entrust approval requirement for pilot generation.

The next increment is cross-bureau account reconciliation followed by separate risk-dimension and
confidence calculations.
