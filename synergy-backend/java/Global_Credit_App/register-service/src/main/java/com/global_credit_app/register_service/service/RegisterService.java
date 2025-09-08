package com.global_credit_app.register_service.service;

import com.global_credit_app.register_service.dto.UserDTO;
import com.global_credit_app.register_service.model.User;
import com.global_credit_app.register_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RegisterService {

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public Optional<String> validateNewUser(UserDTO dto) {

        if ((dto.getEmail() == null || dto.getEmail().isEmpty()) &&
                (dto.getPhoneNumber() == null || dto.getPhoneNumber().isEmpty())) {
            return Optional.of("Either email or phone number is required");
        }

        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            return Optional.of("Email already exists.");
        }

        if (userRepository.findByPassportNumber(dto.getPassportNumber()).isPresent()) {
            return Optional.of("Passport number already registered.");
        }

        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            return Optional.of("Password and confirm password do not match.");
        }

        return Optional.empty();
    }

    public User registerUser(UserDTO dto) {
        User user = new User();
        user.setPassportNumber(dto.getPassportNumber());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setEmail(dto.getEmail());
        user.setPhoneNumber(dto.getPhoneNumber());
        user.setPassword(encoder.encode(dto.getPassword()));

        return userRepository.save(user);
    }
}
