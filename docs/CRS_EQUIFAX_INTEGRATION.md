# CRS U.S. tri-bureau integration

The implementation supports synthetic Equifax, Experian and TransUnion fixtures plus a disabled-by-default live mode.

## Local fixture test

Keep these defaults in `application-local.properties`:

```properties
crs.enabled=false
crs.data-mode=fixture
crs.inquiry-type=unconfirmed
```

No CRS call is made and no provider credit is consumed. The borrower setup shows United States bureau evidence only when the destination country is `US`. Fixtures are explicitly labelled synthetic, and native bureau scores are never averaged.

## CRS sandbox

After CRS supplies the account-specific values:

```properties
crs.enabled=true
crs.data-mode=live
crs.base-url=https://api-sandbox.stitchcredit.com/api
crs.bearer-token=replace-locally
crs.equifax-option=replace-locally
crs.experian-config=replace-locally
crs.transunion-config=replace-locally
crs.inquiry-type=soft
```

Never commit the bearer token. Confirm `crs.inquiry-type` with CRS before enabling live mode.

The request captures borrower consent and the `CREDIT_TRANSACTION` permissible purpose. SSN and address are transmitted to CRS but are not stored as separate GCP fields. GCP retains normalized bureau evidence, provider references, consent timestamps, permissible purpose, inquiry type and provenance. Native India and United States bureau scores remain separate.

The documented JSON endpoints are `/equifax/credit-report/{option}`, `/experian/credit-profile/credit-report/basic/{config}` and `/transunion/credit-report/basic/{config}`. Each live response `RequestID` can be used with its documented PDF endpoint. PDF bytes are protected consumer-report data and are not exposed by the fixture flow.
