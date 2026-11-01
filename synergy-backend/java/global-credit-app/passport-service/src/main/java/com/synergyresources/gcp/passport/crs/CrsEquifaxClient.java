package com.synergyresources.gcp.passport.crs;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.config.CrsProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
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
  private boolean blank(String v){return v==null||v.isBlank();}
  public record Request(String firstName,String middleName,String lastName,String suffix,String dob,String ssn,String phone,String houseNumber,String streetName,String streetType,String apartmentNumber,String city,String state,String zip){}
  public record Response(String requestId,JsonNode body){}
}
