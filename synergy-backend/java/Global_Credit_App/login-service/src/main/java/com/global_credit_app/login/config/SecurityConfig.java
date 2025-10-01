package com.global_credit_app.login.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    // IMPORTANT: this should be the issuer (not jwks), like:
    // https://cognito-idp.us-east-1.amazonaws.com/us-east-1_dRmaCVKxV
    @Value("${aws.cognito.issuer}")
    private String issuer;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable());

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/actuator/health", "/actuator/health/**", "/actuator/info"
                ).permitAll()
                .requestMatchers(
                        "/api/login", "/api/login/**",
                        "/api/signup", "/api/signup/**"
                ).permitAll()
                .anyRequest().authenticated()
        );

        // Let Spring derive the JWKS from the issuer automatically
        http.oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwkSetUri(issuer + "/.well-known/jwks.json"))
        );

        return http.build();
    }
}
