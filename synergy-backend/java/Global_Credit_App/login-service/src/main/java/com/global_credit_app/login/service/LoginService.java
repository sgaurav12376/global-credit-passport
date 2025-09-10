package com.global_credit_app.login.service;

import software.amazon.awssdk.services.cognitoidentityprovider.model.UsernameExistsException;
import com.global_credit_app.login.dto.*;
import com.global_credit_app.login.model.UserAuthMetadata;
import com.global_credit_app.login.repository.UserAuthMetadataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final CognitoClient cognitoClient;
    private final UserAuthMetadataRepository metaRepo;

    @Transactional
    public ResponseEntity<ApiResponse<LoginResponseDTO>> login(LoginRequestDTO dto) {
        String email = dto.getEmail() != null ? dto.getEmail().trim() : null;
        String phone = dto.getPhoneNumber() != null ? dto.getPhoneNumber().trim() : null;
        String password = dto.getPassword();

        String username = (email != null && !email.isBlank())
                ? email
                : (phone != null && !phone.isBlank() ? phone : null);

        if (username == null) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Provide either email or phoneNumber", null));
        }
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Password is required", null));
        }

        try {
            var tokens = cognitoClient.passwordAuth(username, password);
            var cu = cognitoClient.getUser(tokens.accessToken());

            var entity = metaRepo.findByCognitoSub(cu.sub()).orElseGet(UserAuthMetadata::new);
            entity.setCognitoSub(cu.sub());
            entity.setUsername(cu.username());
            entity.setEmail(cu.email());
            entity.setEmailVerified(cu.emailVerified());
            entity.setMfaPreferred(cu.preferredMfa());
            entity.setMfaEnabled(cu.mfaEnabled());
            entity.setStatus(cu.status());
            entity.setUserCreateTime(cu.created());
            entity.setLastModifiedTime(cu.modified());
            entity.setLastLoginTime(Instant.now());
            entity.setRawAttrsJson(cu.attrs().toString());
            metaRepo.save(entity);

            var resp = new LoginResponseDTO();
            resp.setMessage("Login successful via Cognito");
            resp.setEmail(cu.email());
            resp.setPhoneNumber(dto.getPhoneNumber());
            resp.setIdToken(tokens.idToken());
            resp.setAccessToken(tokens.accessToken());
            resp.setRefreshToken(tokens.refreshToken());

            return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", resp));

        } catch (software.amazon.awssdk.services.cognitoidentityprovider.model.NotAuthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(false, "Invalid credentials or challenge required", null));
        } catch (software.amazon.awssdk.services.cognitoidentityprovider.model.UserNotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(false, "User not found in Cognito", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "Login failed: " + e.getMessage(), null));
        }
    }

    /** === SIGNUP: create Cognito user + set permanent password + upsert metadata === */
    @Transactional
    public ResponseEntity<ApiResponse<SignupResponseDTO>> signup(SignupRequestDTO dto) {
        try {
            // 1) Create user in Cognito (no email sent)
            String username = cognitoClient.adminCreateUser(dto.getEmail(), dto.getPhoneNumber());

            // 2) Set permanent password so no NEW_PASSWORD_REQUIRED
            cognitoClient.adminSetPermanentPassword(username, dto.getPassword());

            // 3) Optional: authenticate once to pull attributes and upsert metadata
            var tokens = cognitoClient.passwordAuth(dto.getEmail(), dto.getPassword());
            var cu = cognitoClient.getUser(tokens.accessToken());

            var entity = metaRepo.findByCognitoSub(cu.sub()).orElseGet(UserAuthMetadata::new);
            entity.setCognitoSub(cu.sub());
            entity.setUsername(cu.username());
            entity.setEmail(cu.email());
            entity.setEmailVerified(cu.emailVerified());
            entity.setMfaPreferred(cu.preferredMfa());
            entity.setMfaEnabled(cu.mfaEnabled());
            entity.setStatus(cu.status());
            entity.setUserCreateTime(cu.created());
            entity.setLastModifiedTime(cu.modified());
            entity.setLastLoginTime(Instant.now());
            entity.setRawAttrsJson(cu.attrs().toString());
            metaRepo.save(entity);

            var resp = new SignupResponseDTO(dto.getEmail(), "Cognito user created with permanent password");
            return ResponseEntity.ok(new ApiResponse<>(true, "Signup successful", resp));
        } catch (UsernameExistsException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse<>(false, "User already exists in Cognito", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "Signup failed: " + e.getMessage(), null));
        }
    }
}
