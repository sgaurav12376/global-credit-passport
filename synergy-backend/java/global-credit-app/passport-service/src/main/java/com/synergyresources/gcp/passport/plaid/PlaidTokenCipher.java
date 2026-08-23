package com.synergyresources.gcp.passport.plaid;

import com.synergyresources.gcp.passport.config.PlaidProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PlaidTokenCipher {
  private static final int IV_LENGTH = 12;
  private static final int GCM_TAG_BITS = 128;

  private final SecretKeySpec key;
  private final SecureRandom secureRandom = new SecureRandom();

  public PlaidTokenCipher(PlaidProperties properties) {
    try {
      byte[] decoded = Base64.getDecoder().decode(properties.tokenEncryptionKey());
      if (decoded.length != 32) {
        throw new IllegalArgumentException("PLAID_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
      }
      this.key = new SecretKeySpec(decoded, "AES");
    } catch (NullPointerException | IllegalArgumentException exception) {
      throw new IllegalStateException(
          "PLAID_TOKEN_ENCRYPTION_KEY must be a Base64-encoded 32-byte key",
          exception
      );
    }
  }

  public String encrypt(String plaintext) {
    try {
      byte[] iv = new byte[IV_LENGTH];
      secureRandom.nextBytes(iv);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
      byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
      return "v1:" + Base64.getEncoder().encodeToString(iv)
          + ":" + Base64.getEncoder().encodeToString(encrypted);
    } catch (GeneralSecurityException exception) {
      throw new IllegalStateException("Unable to encrypt Plaid access token", exception);
    }
  }

  public String decrypt(String encoded) {
    try {
      String[] parts = encoded.split(":", 3);
      if (parts.length != 3 || !"v1".equals(parts[0])) {
        throw new IllegalArgumentException("Unsupported encrypted token format");
      }
      byte[] iv = Base64.getDecoder().decode(parts[1]);
      byte[] encrypted = Base64.getDecoder().decode(parts[2]);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
      return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    } catch (GeneralSecurityException | IllegalArgumentException exception) {
      throw new IllegalStateException("Unable to decrypt Plaid access token", exception);
    }
  }
}
