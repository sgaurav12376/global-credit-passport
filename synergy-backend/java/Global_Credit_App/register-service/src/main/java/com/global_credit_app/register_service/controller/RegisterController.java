package com.global_credit_app.register_service.controller;

import com.global_credit_app.register_service.dto.ApiResponse;
import com.global_credit_app.register_service.dto.UserDTO;
import com.global_credit_app.register_service.model.User;
import com.global_credit_app.register_service.service.RegisterService;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/register")
public class RegisterController {

    @Autowired
    private RegisterService registerService;

    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> register(@Valid @RequestBody UserDTO userDTO, BindingResult result) {
        if (result.hasErrors()) {
            StringBuilder errors = new StringBuilder();
            result.getAllErrors().forEach(e -> errors.append(e.getDefaultMessage()).append("; "));
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(false, errors.toString(), null)
            );
        }

        // Validate user data
        var validationError = registerService.validateNewUser(userDTO);
        if (validationError.isPresent()) {
            return ResponseEntity.status(409).body(
                    new ApiResponse<>(false, validationError.get(), null)
            );
        }

        // Register user
        User user = registerService.registerUser(userDTO);

        // Prepare DTO to return (optional — only include non-sensitive data)
        UserDTO responseDTO = new UserDTO();
        responseDTO.setFirstName(user.getFirstName());
        responseDTO.setLastName(user.getLastName());
        responseDTO.setEmail(user.getEmail());
        responseDTO.setPassportNumber(user.getPassportNumber());
        responseDTO.setPhoneNumber(user.getPhoneNumber());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User registered successfully. Please login.", responseDTO)
        );
    }
}
