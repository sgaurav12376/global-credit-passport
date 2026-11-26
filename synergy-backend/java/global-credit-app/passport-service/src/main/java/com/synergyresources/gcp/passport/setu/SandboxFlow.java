package com.synergyresources.gcp.passport.setu;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.time.*;
import java.util.*;

final class SandboxFlow {
  record View(String state,String launchUrl) {}
  private String state="idle", url, consent, session;
  private Map<String,String> range;

  synchronized View view(){return new View(state,"pending".equals(state)?url:null);}
  synchronized View start(SandboxGateway api, Map<String,String> dates) {
    if(!Set.of("idle","declined","expired","failed").contains(state)) return view();
    range=dates;
    var r=api.consent(range);
    var uri=URI.create(r.path("url").asText());
    if(!"https".equals(uri.getScheme()) || !"fiu-sandbox.setu.co".equalsIgnoreCase(uri.getHost())
       || uri.getUserInfo()!=null || (uri.getPort()!=-1 && uri.getPort()!=443))
      throw new IllegalStateException("Unexpected sandbox launch URL");
    consent=UUID.fromString(r.path("id").asText()).toString();
    url=uri.toString(); session=null; state="pending"; return view();
  }
  synchronized View check(SandboxGateway api) {
    if(!Set.of("pending","fetching").contains(state)) return view();
    var c=api.request("consents/"+consent,null);
    if(!consent.equals(c.path("id").asText())) throw new IllegalStateException("Consent mismatch");
    switch(c.path("status").asText()) {
      case "ACTIVE": break;
      case "REJECTED","REVOKED": state="declined"; return view();
      case "EXPIRED": state="expired"; return view();
      default: return view();
    }
    if(session==null) {
      // Do not replay an ambiguous one-time fetch after a timeout.
      state="failed";
      var r=api.request("sessions",Map.of("consentId",consent,"dataRange",range,"format","json"));
      session=UUID.fromString(r.path("id").asText()).toString();
      state="fetching"; return view();
    }
    var r=api.request("sessions/"+session,null);
    if(!session.equals(r.path("id").asText()) || !consent.equals(r.path("consentId").asText()))
      throw new IllegalStateException("Session mismatch");
    switch(r.path("status").asText()) {
      case "COMPLETED":
        state="failed";
        for(JsonNode f:r.path("fips")) for(JsonNode a:f.path("accounts"))
          if(a.path("data").path("account").path("transactions").path("transaction").isArray())
            state="connected";
        break;
      case "FAILED","EXPIRED","PARTIAL": state="failed"; break;
      default: break;
    }
    return view();
  }
}
