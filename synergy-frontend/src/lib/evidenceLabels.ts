export function friendlyEvidenceSource(provider?: string | null, country?: string | null, synthetic = false) {
  const normalized = (provider || "").toUpperCase();
  const countryName = country === "IN" ? "India" : country === "US" ? "U.S." : country;
  const region = countryName ? `${countryName} ` : "";
  if (synthetic || normalized.includes("SIMULATOR")) return `${region}credit history — simulated`;
  if (normalized.includes("PLAID")) return `${region}open-banking evidence`;
  if (normalized.includes("ENTRUST")) return "Identity verification";
  if (normalized.includes("SUREPASS") || normalized.includes("CIBIL")) return `${region}credit-bureau evidence`;
  if (!provider) return "Evidence unavailable";
  return `${region}verified financial evidence`;
}

export function friendlyPassportStatus(status?: string | null) {
  if (status === "PILOT_SIMULATION_READY") return "Ready for pilot review";
  if (status === "PILOT_READY") return "Ready for review";
  return (status || "Ready").toLowerCase().replaceAll("_", " ");
}

export function friendlyObservedValue(metric: string, value: number | string | null, unit?: string | null) {
  if (value == null) return "Unavailable";
  const numericValue = Number(value);
  const textValue = String(value).toLowerCase();
  if (metric === "credit.repayment_behavior") {
    return textValue.includes("max dpd 0") || textValue.includes("no reported delinquency") || numericValue >= 100
      ? "No delinquency reported"
      : "Late-payment information reported";
  }
  if (metric === "credit.utilization_ratio") return `${value}% of available credit used`;
  if (metric === "cashflow.debt_to_income_ratio") return `Debt payments equal ${value}% of income`;
  if (metric === "cashflow.net_cashflow_to_income_ratio") return `Net cash flow equals ${value}% of income`;
  if (metric === "cashflow.income_stability_percent") return `${value}% income stability`;
  if (metric === "credit.recent_enquiries") return `${value} recent credit ${numericValue === 1 ? "enquiry" : "enquiries"}`;
  if (unit === "PERCENT") return `${value}%`;
  if (unit === "MONTHS") return numericValue >= 12 ? `${Math.round(numericValue / 12)} years` : `${value} months`;
  if (unit === "COUNT") return `${value}`;
  return `${value} ${(unit || "").toLowerCase().replaceAll("_", " ")}`.trim();
}

export function friendlyBureauLabel(bureau?: string | null) {
  if (!bureau) return "Credit score";
  if (bureau.toUpperCase() === "CIBIL_SIMULATED") return "India credit score — simulated";
  return bureau.replaceAll("_", " ");
}

export function friendlyRuleExplanation(
  metric: string,
  observedValue: number | string | null,
  score: number | null
) {
  if (observedValue == null || score == null) return "This factor was not scored because the required information was unavailable.";
  const value = Number(observedValue);
  if (metric === "credit.repayment_behavior") {
    return score === 100
      ? "No late payments, defaults or write-offs were reported, so this factor received the strongest score."
      : "Reported late-payment or default information reduced this factor's score.";
  }
  if (metric === "credit.utilization_ratio") {
    return `You used ${observedValue}% of your available credit. Lower utilization generally indicates more available borrowing capacity, resulting in ${score}/100.`;
  }
  if (metric === "cashflow.debt_to_income_ratio") {
    return `Observed debt payments were ${observedValue}% of identified income. A lower percentage leaves more income available after debt payments, resulting in ${score}/100.`;
  }
  if (metric === "cashflow.net_cashflow_to_income_ratio") {
    return `${observedValue}% of identified income remained as sustainable net cash flow after analyzed outflows, resulting in ${score}/100.`;
  }
  if (metric === "cashflow.income_stability_percent") {
    return `Income consistency across the complete months analyzed was ${observedValue}%, resulting in ${score}/100.`;
  }
  if (metric === "credit.history_months") {
    const years = value >= 12 ? Math.round(value / 12) : null;
    return `The reported credit history covered ${years == null ? `${observedValue} months` : `${years} years`}. Longer verified history provides more evidence of credit behavior, resulting in ${score}/100.`;
  }
  if (metric === "credit.recent_enquiries") {
    return `${observedValue} recent credit ${value === 1 ? "enquiry was" : "enquiries were"} reported. Fewer recent enquiries generally indicate less new-credit activity, resulting in ${score}/100.`;
  }
  return `The observed result produced a score of ${score}/100 under the current pilot rules.`;
}
