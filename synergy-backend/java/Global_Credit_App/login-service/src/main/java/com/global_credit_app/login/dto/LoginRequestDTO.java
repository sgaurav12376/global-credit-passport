// LoginRequestDTO.java
package com.global_credit_app.login.dto;

import jakarta.validation.constraints.NotBlank;

public class LoginRequestDTO {
    private String email;
    private String phoneNumber;

    @NotBlank(message = "Password is required")
    private String password;

    // Getters and setters
    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
