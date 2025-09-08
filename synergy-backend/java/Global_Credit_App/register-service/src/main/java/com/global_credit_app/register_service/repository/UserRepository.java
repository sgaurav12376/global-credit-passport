package com.global_credit_app.register_service.repository;

import com.global_credit_app.register_service.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPassportNumber(String passportNumber);

}
