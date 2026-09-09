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

## Next increment

Persist normalized datasets independently, reconcile duplicate bureau accounts, calculate
evidence coverage, and define the minimum-evidence policy before implementing risk weights.
