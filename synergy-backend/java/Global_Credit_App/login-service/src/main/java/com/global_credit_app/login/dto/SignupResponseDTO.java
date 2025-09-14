package com.global_credit_app.login.dto;

public class SignupResponseDTO {
    private String email;
    private String message;

    public SignupResponseDTO() {}
    public SignupResponseDTO(String email, String message) {
        this.email = email; this.message = message;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
