package com.synergyresources.gcp.passport.setu;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SandboxFlowTest {
  final ObjectMapper json=new ObjectMapper();
  final SandboxGateway api=mock(SandboxGateway.class);
  final SandboxFlow flow=new SandboxFlow();
  final String id=UUID.randomUUID().toString(), sid=UUID.randomUUID().toString();
  final Map<String,String> range=Map.of("from","2023-01-01T00:00:00Z","to","2023-02-01T00:00:00Z");
  void start(){
    when(api.consent(range)).thenReturn(json.valueToTree(Map.of("id",id,"url","https://fiu-sandbox.setu.co/test")));
    assertEquals("pending",flow.start(api,range).state());
    assertEquals(flow.view(),flow.start(api,range));
    verify(api,times(1)).consent(range);
  }
  void consent(String state){
    when(api.request("consents/"+id,null)).thenReturn(json.valueToTree(Map.of("id",id,"status",state)));
  }
  void fetch(String state,List<?> fips){
    start();consent("ACTIVE");
    when(api.request(eq("sessions"),anyMap())).thenReturn(json.valueToTree(Map.of("id",sid)));
    assertEquals("fetching",flow.check(api).state());
    when(api.request("sessions/"+sid,null)).thenReturn(json.valueToTree(Map.of("id",sid,"consentId",id,"status",state,"fips",fips)));
  }
  @Test void decliningDoesNotFetch(){start(); consent("REJECTED");assertEquals("declined",flow.check(api).state());verify(api,never()).request(eq("sessions"),any());}
  @Test void approvalThenFailedFetchDoesNotConnect(){fetch("FAILED",List.of());assertEquals("failed",flow.check(api).state());}
  @Test void noAccountDataDoesNotConnect(){fetch("COMPLETED",List.of());assertEquals("failed",flow.check(api).state());}
  @Test void statusReadAfterReturnDoesNotDuplicateSession(){
    fetch("COMPLETED",List.of(Map.of("accounts",List.of(Map.of("data",Map.of("account",Map.of("transactions",Map.of("transaction",List.of()))))))));
    assertEquals("fetching",flow.view().state());
    assertEquals("connected",flow.check(api).state());
    assertEquals("connected",flow.view().state());
    verify(api,times(1)).request(eq("sessions"),anyMap());
  }
}
