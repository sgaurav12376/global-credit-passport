package com.synergyresources.gcp.passport.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(PlaidProperties.class)
public class PlaidConfig {

  @Bean
  RestClient plaidRestClient(RestClient.Builder builder, PlaidProperties properties) {
    var requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(10_000);
    requestFactory.setReadTimeout(60_000);

    return builder
        .baseUrl(properties.baseUrl())
        .requestFactory(requestFactory)
        .defaultHeader("PLAID-CLIENT-ID", properties.clientId())
        .defaultHeader("PLAID-SECRET", properties.secret())
        .build();
  }
}
