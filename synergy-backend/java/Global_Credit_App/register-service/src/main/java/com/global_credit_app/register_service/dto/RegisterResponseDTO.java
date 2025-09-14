package com.global_credit_app.register_service.dto;

import java.util.Map;

public class RegisterResponseDTO {
    private String email;
    private String phoneNumber;
    private String message;

    // Tokens from Cognito
    private String idToken;
    private String accessToken;
    private String refreshToken;

    // Decoded ID token claims (not cryptographically verified)
    private Map<String, Object> idTokenClaims;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getIdToken() { return idToken; }
    public void setIdToken(String idToken) { this.idToken = idToken; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public Map<String, Object> getIdTokenClaims() { return idTokenClaims; }
    public void setIdTokenClaims(Map<String, Object> idTokenClaims) { this.idTokenClaims = idTokenClaims; }
}
