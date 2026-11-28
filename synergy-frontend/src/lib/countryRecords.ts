export type CountryCreditRecord = {
  countryCode: string; provider: string; bureau: string;
  value?: number | null; minimum?: number | null; maximum?: number | null;
  completeness?: number;
};
export const countryCode = (value?: string | null): string => {
  const code = (value || '').trim().toUpperCase();
  return code === 'UK' ? 'GB' : /^[A-Z]{2}$/.test(code) ? code : '';
};
export function countryRecords(origin: string, destination: string,
  credit: readonly CountryCreditRecord[], financial: readonly {countryCode: string}[],
  additional: readonly string[] = []) {
  const countries = [...new Set([origin, destination, ...additional,
    ...credit.map(r => r.countryCode), ...financial.map(r => r.countryCode)].map(countryCode).filter(Boolean))];
  return countries.map(code => ({ code,
    role: code === countryCode(origin) && code === countryCode(destination) ? 'Source and destination' :
      code === countryCode(destination) ? 'Destination' : code === countryCode(origin) ? 'Source' : 'Additional history',
    credit: credit.filter(r => countryCode(r.countryCode) === code),
    financial: financial.filter(r => countryCode(r.countryCode) === code),
  }));
}
