package com.synergyresources.gcp.passport.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(CrsProperties.class)
public class CrsConfig {
  @Bean
  @Qualifier("crsRestClient")
  RestClient crsRestClient(RestClient.Builder builder, CrsProperties properties) {
    var requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(10_000);
    requestFactory.setReadTimeout(120_000);
    return builder.baseUrl(properties.baseUrl()).requestFactory(requestFactory).build();
  }
}
