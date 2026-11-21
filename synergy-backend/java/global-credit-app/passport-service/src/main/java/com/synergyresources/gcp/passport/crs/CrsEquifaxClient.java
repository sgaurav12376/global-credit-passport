package com.synergyresources.gcp.passport.crs;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.config.CrsProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CrsEquifaxClient {
  private final RestClient client; private final CrsProperties properties;
  public CrsEquifaxClient(@Qualifier("crsRestClient") RestClient client, CrsProperties properties){this.client=client;this.properties=properties;}
  public Response fetch(Request request){
    if(!properties.enabled()) throw new IllegalStateException("CRS live API is disabled");
    if(blank(properties.bearerToken())||blank(properties.equifaxOption())) throw new IllegalStateException("CRS bearer token and Equifax option are required");
    var response=client.post().uri("/equifax/credit-report/{option}", properties.equifaxOption())
        .header(HttpHeaders.AUTHORIZATION,"Bearer "+properties.bearerToken()).body(request).retrieve().toEntity(JsonNode.class);
    String requestId=response.getHeaders().getFirst("RequestID");
    if(requestId==null) requestId=response.getHeaders().getFirst("Request-Id");
    if(response.getBody()==null) throw new IllegalStateException("CRS returned an empty response");
    return new Response(requestId,response.getBody());
  }
  public Response fetchExperian(BasicRequest request){
    return fetchBasic("/experian/credit-profile/credit-report/basic/{config}",properties.experianConfig(),"Experian",request);
  }
  public Response fetchTransUnion(BasicRequest request){
    return fetchBasic("/transunion/credit-report/basic/{config}",properties.transunionConfig(),"TransUnion",request);
  }
  private Response fetchBasic(String path,String config,String label,BasicRequest request){
    if(!properties.enabled()) throw new IllegalStateException("CRS live API is disabled");
    if(blank(properties.bearerToken())||blank(config)) throw new IllegalStateException("CRS bearer token and "+label+" config are required");
    var response=client.post().uri(path,config).header(HttpHeaders.AUTHORIZATION,"Bearer "+properties.bearerToken())
        .body(request).retrieve().toEntity(JsonNode.class);
    String requestId=response.getHeaders().getFirst("RequestID");
    if(requestId==null) requestId=response.getHeaders().getFirst("Request-Id");
    if(response.getBody()==null) throw new IllegalStateException("CRS returned an empty "+label+" response");
    return new Response(requestId,response.getBody());
  }
  public byte[] fetchPdf(String bureau,String requestId){
    String normalized=bureau==null?"":bureau.toUpperCase();String path;String config;
    switch(normalized){
      case "EQUIFAX"->{path="/equifax/custom-credit-report/{requestId}/{config}";config=properties.equifaxOption();}
      case "EXPERIAN"->{path="/experian/credit-profile/custom-credit-report/pdf/{requestId}/{config}";config=properties.experianConfig();}
      case "TRANSUNION"->{path="/transunion/custom-credit-report/pdf/{requestId}/{config}";config=properties.transunionConfig();}
      default->throw new IllegalArgumentException("Unsupported CRS bureau: "+bureau);
    }
    if(!properties.enabled()||blank(properties.bearerToken())||blank(config)||blank(requestId))throw new IllegalStateException("CRS PDF retrieval is not configured");
    byte[] body=client.post().uri(path,requestId,config).header(HttpHeaders.AUTHORIZATION,"Bearer "+properties.bearerToken()).accept(MediaType.APPLICATION_PDF).retrieve().body(byte[].class);
    if(body==null||body.length==0)throw new IllegalStateException("CRS returned an empty PDF response");return body;
  }
  private boolean blank(String v){return v==null||v.isBlank();}
  public record Request(String firstName,String middleName,String lastName,String suffix,String dob,String ssn,String phone,String houseNumber,String streetName,String streetType,String apartmentNumber,String city,String state,String zip){}
  public record BasicRequest(String firstName,String middleName,String lastName,String nameSuffix,String dob,String ssn,String phone,String street1,String city,String state,String zip){}
  public record Response(String requestId,JsonNode body){}
}
