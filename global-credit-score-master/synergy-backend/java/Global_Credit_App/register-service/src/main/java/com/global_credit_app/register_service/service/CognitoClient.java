package com.global_credit_app.register_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Component
public class CognitoClient {

    @Value("${aws.region}")
    private String region;

    @Value("${aws.cognito.userPoolId}")
    private String userPoolId;

    @Value("${aws.cognito.clientId}")
    private String clientId;

    private CognitoIdentityProviderClient cip() {
        return CognitoIdentityProviderClient.builder()
                .region(Region.of(region))
                .build();
    }

    public record Tokens(String idToken, String accessToken, String refreshToken) {}

    /** Create user (idempotent-ish) and set password permanent */
    public void ensureUserWithPassword(String email, String password) {
        try {
            // Try to create (if exists, we'll catch and proceed)
            cip().adminCreateUser(AdminCreateUserRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .userAttributes(
                            AttributeType.builder().name("email").value(email).build(),
                            AttributeType.builder().name("email_verified").value("true").build()
                    )
                    .messageAction(MessageActionType.SUPPRESS)
                    .build());
        } catch (UsernameExistsException e) {
            // user already exists -> fine, continue
        }

        // Always enforce the provided password as permanent
        cip().adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                .userPoolId(userPoolId)
                .username(email)
                .password(password)
                .permanent(true)
                .build());
    }

    /** Do a password auth to get tokens */
    public Tokens passwordAuth(String username, String password) {
        var req = InitiateAuthRequest.builder()
                .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                .clientId(clientId)
                .authParameters(Map.of("USERNAME", username, "PASSWORD", password))
                .build();
        var res = cip().initiateAuth(req);

        if (res.challengeName() != null && res.challengeName() != ChallengeNameType.UNKNOWN_TO_SDK_VERSION) {
            throw NotAuthorizedException.builder()
                    .message("Auth challenge required: " + res.challengeNameAsString())
                    .build();
        }

        var ar = res.authenticationResult();
        return new Tokens(ar.idToken(), ar.accessToken(), ar.refreshToken());
    }

    public record CognitoUser(
            String sub, String username, String email, boolean emailVerified,
            String preferredMfa, boolean mfaEnabled, String status,
            Instant created, Instant modified, List<AttributeType> attrs) {}

    public CognitoUser getUser(String accessToken) {
        var gu = cip().getUser(GetUserRequest.builder().accessToken(accessToken).build());

        String sub = attr(gu, "sub");
        String email = attr(gu, "email");
        boolean emailVerified = Boolean.parseBoolean(attr(gu, "email_verified"));
        String preferredMfa = gu.preferredMfaSetting();
        boolean mfaEnabled = gu.userMFASettingList() != null && !gu.userMFASettingList().isEmpty();

        var admin = cip().adminGetUser(b -> b.userPoolId(userPoolId).username(gu.username()));

        return new CognitoUser(
                sub, gu.username(), email, emailVerified,
                preferredMfa, mfaEnabled, admin.userStatusAsString(),
                admin.userCreateDate(), admin.userLastModifiedDate(), gu.userAttributes()
        );
    }

    private static String attr(GetUserResponse gu, String name) {
        return gu.userAttributes().stream()
                .filter(a -> name.equals(a.name()))
                .map(AttributeType::value)
                .findFirst()
                .orElse(null);
    }
}
