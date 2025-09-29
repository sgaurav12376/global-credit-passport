package com.global_credit_app.register_service.service;

import com.global_credit_app.register_service.dto.RegisterResponseDTO;
import com.global_credit_app.register_service.dto.UserDTO;
import com.global_credit_app.register_service.model.User;
import com.global_credit_app.register_service.repository.UserRepository;
import com.nimbusds.jwt.SignedJWT;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private final UserRepository userRepository;
    private final CognitoClient cognitoClient; // AWS code unchanged

    /** Do the full flow and return a response DTO */
    public RegisterResponseDTO registerAndLogin(UserDTO dto) {
        final String email = safeTrim(dto.getEmail());

        // 1) Create/ensure user in Cognito and set password permanent
        cognitoClient.ensureUserWithPassword(email, dto.getPassword());

        // 2) Authenticate to get tokens
        var tokens = cognitoClient.passwordAuth(email, dto.getPassword());

        // 3) Save profile in RDS (NO password stored)
        User user = new User();
        user.setFirstName(safeTrim(dto.getFirstName()));
        user.setLastName(safeTrim(dto.getLastName()));
        user.setEmail(email);
        user.setPhoneNumber(safeTrim(dto.getPhoneNumber()));
        user.setCountry(safeTrim(dto.getCountry()));
        user.setGender(safeTrim(dto.getGender()));
        user.setNationalId(safeTrim(dto.getNationalId()));

        // Parse ISO date (UI sends "YYYY-MM-DD"); if bad, store null (no validation)
        user.setDateOfBirth(parseDate(dto.getDateOfBirth()));

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

    private static String safeTrim(String s) {
        return s == null ? null : s.trim();
    }

    private static LocalDate parseDate(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return LocalDate.parse(iso);
        } catch (DateTimeParseException ignored) {
            return null;
        }
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
