package com.global_credit_app.register_service.controller;

import com.global_credit_app.register_service.dto.ApiResponse;
import com.global_credit_app.register_service.dto.RegisterResponseDTO;
import com.global_credit_app.register_service.dto.UserDTO;
import com.global_credit_app.register_service.service.RegisterService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/register")
@RequiredArgsConstructor
public class RegisterController {

    private final RegisterService registerService;

    @PostMapping
    public ResponseEntity<ApiResponse<RegisterResponseDTO>> register(@RequestBody UserDTO userDTO) {
        try {
            var resp = registerService.registerAndLogin(userDTO);
            return ResponseEntity.ok(new ApiResponse<>(true, "User registered and logged in.", resp));
        } catch (software.amazon.awssdk.services.cognitoidentityprovider.model.UsernameExistsException e) {
            return ResponseEntity.status(409).body(new ApiResponse<>(false, "Cognito user already exists.", null));
        } catch (software.amazon.awssdk.services.cognitoidentityprovider.model.NotAuthorizedException e) {
            return ResponseEntity.status(401).body(new ApiResponse<>(false, "Auth challenge or invalid auth.", null));
        } catch (DataIntegrityViolationException e) {
            // Handles DB unique constraints (e.g., email)
            return ResponseEntity.status(409).body(new ApiResponse<>(false, "Email already exists.", null));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new ApiResponse<>(false, "Registration failed: " + e.getMessage(), null));
        }
    }
}
