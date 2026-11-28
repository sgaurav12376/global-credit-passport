export type BorrowerFactor = { key: string; label: string; available: boolean; score?: number | null };
export function borrowerFactorLabel(label: string): string {
  const labels: Record<string, string> = {
    'repayment behavior': 'Payment history', 'credit utilization': 'Credit usage',
    'debt burden': 'Observed debt repayments', 'observed debt repayments': 'Observed debt repayments',
    'cash-flow capacity': 'Money remaining after recorded expenses', 'cash flow capacity': 'Money remaining after recorded expenses',
    'income stability': 'Income stability', 'credit-history depth': 'Length of credit history',
    'credit history depth': 'Length of credit history', 'recent credit enquiries': 'Recent credit checks',
  };
  return labels[label.toLowerCase()] || label;
}
export function borrowerFactorGroup(factor: BorrowerFactor): 'attention' | 'supporting' | 'missing' {
  if (!factor.available || typeof factor.score !== 'number' || !Number.isFinite(factor.score) || factor.score < 0 || factor.score > 100) return 'missing';
  return factor.score < 70 ? 'attention' : 'supporting';
}
