package com.global_credit_app.login.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_auth_metadata", uniqueConstraints = {
        @UniqueConstraint(name = "uk_userauth_cognito_sub", columnNames = "cognito_sub")
})
public class UserAuthMetadata {

    @Id @GeneratedValue
    private UUID userId;

    @Column(name = "cognito_sub", nullable = false, unique = true)
    private String cognitoSub;

    @Column(nullable = false) private String username;
    @Column(nullable = false) private String email;

    private Boolean emailVerified;
    private String mfaPreferred;
    private Boolean mfaEnabled;
    private String status;

    private Instant userCreateTime;
    private Instant lastModifiedTime;
    private Instant lastLoginTime;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String rawAttrsJson;

    // getters & setters
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getCognitoSub() { return cognitoSub; }
    public void setCognitoSub(String cognitoSub) { this.cognitoSub = cognitoSub; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Boolean getEmailVerified() { return emailVerified; }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }
    public String getMfaPreferred() { return mfaPreferred; }
    public void setMfaPreferred(String mfaPreferred) { this.mfaPreferred = mfaPreferred; }
    public Boolean getMfaEnabled() { return mfaEnabled; }
    public void setMfaEnabled(Boolean mfaEnabled) { this.mfaEnabled = mfaEnabled; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getUserCreateTime() { return userCreateTime; }
    public void setUserCreateTime(Instant userCreateTime) { this.userCreateTime = userCreateTime; }
    public Instant getLastModifiedTime() { return lastModifiedTime; }
    public void setLastModifiedTime(Instant lastModifiedTime) { this.lastModifiedTime = lastModifiedTime; }
    public Instant getLastLoginTime() { return lastLoginTime; }
    public void setLastLoginTime(Instant lastLoginTime) { this.lastLoginTime = lastLoginTime; }
    public String getRawAttrsJson() { return rawAttrsJson; }
    public void setRawAttrsJson(String rawAttrsJson) { this.rawAttrsJson = rawAttrsJson; }
}
