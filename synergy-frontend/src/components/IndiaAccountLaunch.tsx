import {useEffect, useState} from "react";
import {getAccessToken} from "../auth/auth";

type State = "idle"|"pending"|"fetching"|"connected"|"declined"|"expired"|"failed";
type View = {state: State; launchUrl: string|null};
const labels: Record<State,string> = {idle:"Not connected",pending:"Awaiting consent",fetching:"Fetching transactions",
  connected:"Connected · sandbox data",declined:"Consent declined or revoked",expired:"Consent expired",failed:"Could not fetch account data"};
async function request(id:string, action="" ): Promise<View> {
  const headers=new Headers();
  if ((import.meta.env.VITE_AUTH_MODE||"cognito")!=="local") {
    const token=await getAccessToken();
    if (!token) throw Error("Sign in again to continue.");
    headers.set("Authorization",`Bearer ${token}`);
  }
  const res=await fetch(`${import.meta.env.VITE_API_BASE_URL||"http://localhost:8087"}/v1/passports/${encodeURIComponent(id)}/india-account${action}`,
    {method:action?"POST":"GET",headers,cache:"no-store"});
  if(!res.ok) throw Error(`Could not contact the India account service (${res.status}).`);
  return res.json();
}
export default function IndiaAccountLaunch({id,saveReturn}:{id:string;saveReturn:()=>void}) {
  const [view,setView]=useState<View|null>(null), [error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let cancelled=false, timer:ReturnType<typeof setTimeout>, attempts=0;
    async function refresh(first:boolean) {
      try {
        const v=await request(id,first?"":"/check");
        if(cancelled)return;
        setView(v);setError("");
        if((v.state==="pending"||v.state==="fetching") && attempts++<20)
          timer=setTimeout(()=>void refresh(false),first?100:3000);
      } catch {if(!cancelled)setError("Status unavailable. Check the service, then refresh.");}
    }
    void refresh(true);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[id,reload]);
  async function launch() {
    setBusy(true);setError("");
    try {
      const v=await request(id,"/launch");setView(v);
      if(v.launchUrl && v.state==="pending"){
        const u=new URL(v.launchUrl);
        if(u.origin!=="https://fiu-sandbox.setu.co" || u.username || u.password)throw Error("Unexpected consent address.");
        saveReturn();window.location.assign(u.href);
      }
    }catch(e){setError(e instanceof Error?e.message:"Unable to start consent.");}
    finally{setBusy(false);}
  }
  return <section className="simple-card"><strong>India financial accounts</strong>
    <p role="status">{view?labels[view.state]:"Checking connection…"}</p>
    <small>Sandbox only · account data is not added to your assessment.</small>
    {error && <p role="alert">{error}</p>}
    {view && !["connected","fetching"].includes(view.state) &&
      <button type="button" className="btn" disabled={busy} onClick={()=>void launch()}>
        {view.state==="pending"?"Resume consent":"Connect India account"}</button>}
    {(error||view?.state==="pending"||view?.state==="fetching") &&
      <button type="button" className="btn" onClick={()=>setReload(n=>n+1)}>Refresh status</button>}
  </section>;
}
