package com.global_credit_app.login.repository;

import com.global_credit_app.login.model.UserAuthMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserAuthMetadataRepository extends JpaRepository<UserAuthMetadata, UUID> {
    Optional<UserAuthMetadata> findByCognitoSub(String cognitoSub);
}
