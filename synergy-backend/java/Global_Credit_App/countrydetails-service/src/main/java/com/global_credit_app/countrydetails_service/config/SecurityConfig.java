package com.global_credit_app.countrydetails_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable());

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/actuator/health", "/actuator/health/**", "/actuator/info"
                ).permitAll()
                .requestMatchers("/api/country", "/api/country/**").permitAll()
                .anyRequest().authenticated()
        );

        // If you want it fully public, omit oauth2ResourceServer
        return http.build();
    }
}
