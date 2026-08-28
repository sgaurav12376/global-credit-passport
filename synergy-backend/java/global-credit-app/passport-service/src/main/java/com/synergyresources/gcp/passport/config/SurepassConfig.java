package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(SurepassProperties.class)
public class SurepassConfig {

  @Bean
  RestClient surepassRestClient(RestClient.Builder builder, SurepassProperties properties) {
    var requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(10_000);
    requestFactory.setReadTimeout(90_000);

    RestClient.Builder configured = builder
        .baseUrl(properties.baseUrl())
        .requestFactory(requestFactory);

    if (properties.bearerToken() != null && !properties.bearerToken().isBlank()) {
      configured.defaultHeader(
          HttpHeaders.AUTHORIZATION,
          "Bearer " + properties.bearerToken()
      );
    }

    return configured.build();
  }
}
