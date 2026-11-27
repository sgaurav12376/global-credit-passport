package com.synergyresources.gcp.passport.setu;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="setu.sandbox.enabled", havingValue="true")
class SandboxGateway {
  private final ObjectMapper json;
  private final String clientId, secret, product, vua, redirect;
  private final OkHttpClient http;
  SandboxGateway(ObjectMapper json, @Value("${setu.client-id}") String clientId,
      @Value("${setu.client-secret}") String secret, @Value("${setu.product-id}") String product,
      @Value("${setu.test-vua}") String vua, @Value("${setu.return-url}") String redirect,
      @Value("${setu.network.mode}") String networkMode,
      @Value("${setu.proxy.host:127.0.0.1}") String proxyHost,
      @Value("${setu.proxy.port:1080}") int proxyPort) {
    this.http = SetuHttpClient.create(networkMode, proxyHost, proxyPort);
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
  private JsonNode send(String url, Map<String,String> headers, Object payload) {
    try {
      var builder = new Request.Builder().url(url);
      headers.forEach(builder::header);

      if (payload != null) {
        builder.post(RequestBody.create(
            json.writeValueAsString(payload),
            MediaType.get("application/json")
        ));
      } else {
        builder.get();
      }

      try (Response response = http.newCall(builder.build()).execute()) {
        if (!response.isSuccessful() || response.body() == null) {
          throw new IllegalStateException();
        }
        return json.readTree(response.body().string());
      }
    } catch (Exception e) {
      throw new IllegalStateException("Sandbox request failed");
    }
  }
}
