package com.global_credit_app.login.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
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
    public record CognitoUser(
            String sub, String username, String email, boolean emailVerified,
            String preferredMfa, boolean mfaEnabled, String status,
            Instant created, Instant modified, List<AttributeType> attrs) {}

    /** === AUTH: username/password (non-SRP) === */
    public Tokens passwordAuth(String username, String password) {
        var req = InitiateAuthRequest.builder()
                .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                .clientId(clientId)
                .authParameters(Map.of("USERNAME", username, "PASSWORD", password))
                .build();

        var res = cip().initiateAuth(req);

        if (res.challengeName() != null && res.challengeName() != ChallengeNameType.UNKNOWN_TO_SDK_VERSION) {
            // e.g., NEW_PASSWORD_REQUIRED if permanent not set
            throw NotAuthorizedException.builder()
                    .message("Auth challenge required: " + res.challengeNameAsString())
                    .build();
        }

        var ar = res.authenticationResult();
        return new Tokens(ar.idToken(), ar.accessToken(), ar.refreshToken());
    }

    /** === PROFILE via Access Token + admin detail === */
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

    /** === ADMIN: create user (no email sent) === */
    public String adminCreateUser(String email, String phone) {
        var attrs = new java.util.ArrayList<AttributeType>();
        attrs.add(AttributeType.builder().name("email").value(email).build());
        attrs.add(AttributeType.builder().name("email_verified").value("true").build());
        if (phone != null && !phone.isBlank()) {
            // Must be in E.164 if you use phone for auth; here we just store raw if optional.
            attrs.add(AttributeType.builder().name("phone_number").value(phone).build());
        }

        var req = AdminCreateUserRequest.builder()
                .userPoolId(userPoolId)
                .username(email) // use email as username
                .userAttributes(attrs)
                .messageAction(MessageActionType.SUPPRESS) // do not send invite email
                .build();

        var res = cip().adminCreateUser(req);
        return res.user().username(); // same as email here
    }

    /** === ADMIN: set permanent password (avoid NEW_PASSWORD_REQUIRED) === */
    public void adminSetPermanentPassword(String username, String password) {
        var req = AdminSetUserPasswordRequest.builder()
                .userPoolId(userPoolId)
                .username(username)
                .password(password)
                .permanent(true)
                .build();
        cip().adminSetUserPassword(req);
    }
}
