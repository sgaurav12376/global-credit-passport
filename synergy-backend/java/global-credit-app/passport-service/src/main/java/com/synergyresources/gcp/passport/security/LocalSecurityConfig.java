package com.synergyresources.gcp.passport.security;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@ConditionalOnProperty(name = "gcp.security.auth-mode", havingValue = "local")
public class LocalSecurityConfig {
  private static final Logger log = LoggerFactory.getLogger(LocalSecurityConfig.class);

  @PostConstruct
  void warnLocalAuthentication() {
    log.warn("GCP LOCAL AUTHENTICATION IS ACTIVE - DO NOT USE THIS MODE OUTSIDE DEVELOPMENT");
  }

  @Bean
  SecurityFilterChain localSecurityFilterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .build();
  }
}
