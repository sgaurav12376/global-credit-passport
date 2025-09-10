package com.global_credit_app.register_service.service;

import com.global_credit_app.register_service.dto.RegisterResponseDTO;
import com.global_credit_app.register_service.dto.UserDTO;
import com.global_credit_app.register_service.model.User;
import com.global_credit_app.register_service.repository.UserRepository;
import com.nimbusds.jwt.SignedJWT;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private final UserRepository userRepository;
    private final CognitoClient cognitoClient;

    public Optional<String> validateNewUser(UserDTO dto) {
        if ((dto.getEmail() == null || dto.getEmail().isBlank()) &&
                (dto.getPhoneNumber() == null || dto.getPhoneNumber().isBlank())) {
            return Optional.of("Either email or phone number is required");
        }
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            return Optional.of("Password is required");
        }

        if (dto.getEmail() != null && !dto.getEmail().isBlank()
                && userRepository.findByEmail(dto.getEmail().trim()).isPresent()) {
            return Optional.of("Email already exists.");
        }
        if (dto.getPassportNumber() != null && !dto.getPassportNumber().isBlank()
                && userRepository.findByPassportNumber(dto.getPassportNumber().trim()).isPresent()) {
            return Optional.of("Passport number already registered.");
        }
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            return Optional.of("Password and confirm password do not match.");
        }
        return Optional.empty();
    }

    /** Do the full flow and return a response DTO */
    public RegisterResponseDTO registerAndLogin(UserDTO dto) {
        final String email = dto.getEmail().trim();

        // 1) Create/ensure user in Cognito and set password permanent
        cognitoClient.ensureUserWithPassword(email, dto.getPassword());

        // 2) Authenticate to get tokens
        var tokens = cognitoClient.passwordAuth(email, dto.getPassword());

        // 3) Save profile in RDS (NO password stored)
        User user = new User();
        user.setPassportNumber(dto.getPassportNumber());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setEmail(email);
        user.setPhoneNumber(dto.getPhoneNumber());
        // DO NOT set password -> leave null
        userRepository.save(user);

        // 4) Decode ID token claims (no signature verification here)
        Map<String, Object> claims = safeDecodeClaims(tokens.idToken());

        // 5) Build response
        var resp = new RegisterResponseDTO();
        resp.setMessage("Registration + login successful");
        resp.setEmail(email);
        resp.setPhoneNumber(dto.getPhoneNumber());
        resp.setIdToken(tokens.idToken());
        resp.setAccessToken(tokens.accessToken());
        resp.setRefreshToken(tokens.refreshToken());
        resp.setIdTokenClaims(claims);
        return resp;
    }

    private Map<String, Object> safeDecodeClaims(String idToken) {
        try {
            var jwt = SignedJWT.parse(idToken);
            return new HashMap<>(jwt.getJWTClaimsSet().getClaims());
        } catch (ParseException e) {
            return Map.of("parse_error", e.getMessage());
        }
    }
}
