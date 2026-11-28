import type { CountryCreditRecord } from '../lib/countryRecords';
import { friendlyBureauLabel } from '../lib/evidenceLabels';
export default function CountryCreditScores({ records }: { records: readonly CountryCreditRecord[] }) {
  return <div className="gcp-country-credit"><small>Credit history · {records.length} {records.length === 1 ? 'record' : 'records'}</small>
    {records.length === 0 ? <p>No published credit evidence.</p> : <div className="gcp-mini-scores">{records.map((r,i) => <div key={`${r.provider}-${r.bureau}-${i}`}><span>{friendlyBureauLabel(r.bureau)}</span><b>{r.value ?? '—'}</b><small>{r.minimum != null && r.maximum != null ? `${r.minimum}–${r.maximum}` : 'Native scale'}</small></div>)}</div>}
    {records.length > 0 && <details className="gcp-financial-details"><summary>Credit sources</summary>{records.map((r,i) => <p key={`${r.provider}-${r.bureau}-${i}`}>{friendlyBureauLabel(r.bureau)} · {r.provider}{r.completeness != null ? ` · ${r.completeness}% complete` : ''}</p>)}<p>Native bureau scores are not averaged or converted.</p></details>}
  </div>;
}
