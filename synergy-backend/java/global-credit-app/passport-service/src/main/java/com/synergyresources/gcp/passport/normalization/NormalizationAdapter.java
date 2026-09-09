package com.synergyresources.gcp.passport.normalization;

public interface NormalizationAdapter<I, O> {
  String adapterId();
  String adapterVersion();
  O normalize(I source, NormalizationContext context);
}
