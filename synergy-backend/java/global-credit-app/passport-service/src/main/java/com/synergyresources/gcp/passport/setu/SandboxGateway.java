package com.synergyresources.gcp.passport.setu;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="setu.sandbox.enabled", havingValue="true")
class SandboxGateway {
  private final ObjectMapper json;
  private final String clientId, secret, product, vua, redirect;
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  SandboxGateway(ObjectMapper json, @Value("${setu.client-id}") String clientId,
      @Value("${setu.client-secret}") String secret, @Value("${setu.product-id}") String product,
      @Value("${setu.test-vua}") String vua, @Value("${setu.return-url}") String redirect) {
    this.json=json; this.clientId=clientId; this.secret=secret; this.product=product;
    this.vua=vua; this.redirect=redirect;
  }
  JsonNode request(String path, Object payload) {
    var token=send("https://orgservice-prod.setu.co/v1/users/login",Map.of("client","bridge"),
        Map.of("clientID",clientId,"secret",secret,"grant_type","client_credentials")).path("access_token").asText();
    if(token.isBlank()) throw new IllegalStateException("Sandbox authentication failed");
    return send("https://fiu-sandbox.setu.co/v2/"+path,
        Map.of("Authorization","Bearer "+token,"x-product-instance-id",product),payload);
  }
  JsonNode consent(Map<String,String> range) {
    return request("consents",Map.of("vua",vua,"redirectUrl",redirect,"dataRange",range,
      "consentTypes",List.of("TRANSACTIONS"),"fiTypes",List.of("DEPOSIT"),"fetchType","ONETIME",
      "consentMode","VIEW","enableAdditionalPhoneNumber",false));
  }
  private JsonNode send(String url,Map<String,String> headers,Object payload) {
    try {
      var b=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15));
      headers.forEach(b::header);
      if(payload!=null) b.header("Content-Type","application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)));
      var r=http.send(b.build(),HttpResponse.BodyHandlers.ofString());
      if(r.statusCode()/100 != 2) throw new IllegalStateException();
      return json.readTree(r.body());
    } catch(InterruptedException e) {
      Thread.currentThread().interrupt(); throw new IllegalStateException("Sandbox request interrupted");
    } catch(Exception e) { throw new IllegalStateException("Sandbox request failed"); }
  }
}
