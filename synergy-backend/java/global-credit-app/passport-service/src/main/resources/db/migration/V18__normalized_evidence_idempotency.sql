CREATE UNIQUE INDEX uq_normalized_evidence_source
  ON normalized_evidence (
    passport_id, domain, provider, source_system, provider_reference, schema_version
  );
