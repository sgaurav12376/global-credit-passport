package com.synergyresources.gcp.passport.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@ConditionalOnProperty(
    name = "gcp.security.auth-mode",
    havingValue = "cognito",
    matchIfMissing = true
)
public class CognitoSecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/actuator/health", "/actuator/info").permitAll()
            .requestMatchers("/v1/**").authenticated()
            .anyRequest().denyAll()
        )
        .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
        .build();
  }

  @Bean
  NimbusJwtDecoder jwtDecoder(
      @Value("${gcp.security.cognito-issuer-uri}") String issuer,
      @Value("${gcp.security.cognito-client-id}") String clientId
  ) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(issuer).build();
    OAuth2TokenValidator<Jwt> defaults = JwtValidators.createDefaultWithIssuer(issuer);
    OAuth2TokenValidator<Jwt> cognitoClaims = jwt -> {
      boolean accessToken = "access".equals(jwt.getClaimAsString("token_use"));
      boolean correctClient = clientId.equals(jwt.getClaimAsString("client_id"));
      if (accessToken && correctClient) return OAuth2TokenValidatorResult.success();
      return OAuth2TokenValidatorResult.failure(new OAuth2Error(
          "invalid_token",
          "Expected a Cognito access token issued for this application client",
          null
      ));
    };
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(defaults, cognitoClaims));
    return decoder;
  }
}
