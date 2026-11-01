# CRS Equifax integration

The initial implementation supports a synthetic `fixture` mode and a disabled-by-default `live` mode.

## Local fixture test

Keep these defaults in `application-local.properties`:

```properties
crs.enabled=false
crs.data-mode=fixture
crs.inquiry-type=unconfirmed
```

No CRS call is made and no provider credit is consumed. The borrower setup shows a United States credit card only when the destination country is `US`.

## CRS sandbox

After CRS supplies the account-specific values:

```properties
crs.enabled=true
crs.data-mode=live
crs.base-url=https://api-sandbox.stitchcredit.com/api
crs.bearer-token=replace-locally
crs.equifax-option=replace-locally
crs.inquiry-type=soft
```

Never commit the bearer token. Confirm `crs.inquiry-type` with CRS before enabling live mode.

The request captures borrower consent and the `CREDIT_TRANSACTION` permissible purpose. SSN and address are transmitted to CRS but are not stored as separate GCP fields. GCP retains the normalized Equifax report, provider reference, consent timestamp, permissible purpose, inquiry type and evidence provenance. Native India and United States bureau scores remain separate.
