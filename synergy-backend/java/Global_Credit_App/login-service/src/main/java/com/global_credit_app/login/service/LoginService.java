package com.global_credit_app.login.service;

import com.global_credit_app.login.dto.*;
import com.global_credit_app.login.model.User;
import com.global_credit_app.login.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class LoginService {

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public ResponseEntity<ApiResponse<LoginResponseDTO>> login(LoginRequestDTO dto) {
        if ((dto.getEmail() == null || dto.getEmail().isEmpty()) &&
                (dto.getPhoneNumber() == null || dto.getPhoneNumber().isEmpty())) {
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(false, "Either email or phone number is required", null));
        }

        Optional<User> userOptional = Optional.empty();
        if (dto.getEmail() != null && !dto.getEmail().isEmpty()) {
            userOptional = userRepository.findByEmail(dto.getEmail());
        } else if (dto.getPhoneNumber() != null && !dto.getPhoneNumber().isEmpty()) {
            userOptional = userRepository.findByPhoneNumber(dto.getPhoneNumber());
        }

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    new ApiResponse<>(false, "User not found", null));
        }

        User user = userOptional.get();

        if (!encoder.matches(dto.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    new ApiResponse<>(false, "Invalid credentials", null));
        }

        LoginResponseDTO responseDTO = new LoginResponseDTO();
        responseDTO.setEmail(user.getEmail());
        responseDTO.setPhoneNumber(user.getPhoneNumber());
        responseDTO.setMessage("Login successful");

        return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", responseDTO));
    }
}
