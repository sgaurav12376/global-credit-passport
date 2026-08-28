package com.synergyresources.gcp.passport.surepass;

import com.synergyresources.gcp.passport.config.SurepassProperties;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class SurepassReportDocumentStore {
  private static final byte[] PDF_MAGIC = new byte[] { '%', 'P', 'D', 'F', '-' };
  private final Path root;
  private final long maxDocumentBytes;
  private final HttpClient httpClient;

  public SurepassReportDocumentStore(SurepassProperties properties) {
    if (properties.documentDirectory() == null || properties.documentDirectory().isBlank()) {
      throw new IllegalStateException("Surepass document directory is not configured");
    }
    root = Path.of(properties.documentDirectory()).toAbsolutePath().normalize();
    maxDocumentBytes = properties.maxDocumentBytes() > 0
        ? properties.maxDocumentBytes()
        : 20L * 1024L * 1024L;
    httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build();
  }

  public StoredDocument savePdf(
      UUID borrowerId,
      UUID passportId,
      String encodedDocument,
      String documentLink
  ) {
    byte[] content = encodedDocument == null || encodedDocument.isBlank()
        ? downloadPdf(documentLink)
        : decodeBase64(encodedDocument);
    if (content.length == 0 || content.length > maxDocumentBytes) {
      throw new IllegalStateException("Surepass PDF exceeds the configured size limit");
    }
    if (!startsWith(content, PDF_MAGIC)) {
      throw new IllegalStateException("Surepass document is not a valid PDF");
    }

    String storageKey = borrowerId + "/" + passportId + "/" + UUID.randomUUID() + ".pdf";
    Path destination = resolve(storageKey);
    try {
      Files.createDirectories(destination.getParent());
      Files.write(destination, content);
      try {
        Files.setPosixFilePermissions(
            destination,
            PosixFilePermissions.fromString("rw-------")
        );
      } catch (UnsupportedOperationException ignored) {
        // Non-POSIX filesystems use their configured platform permissions.
      }
      return new StoredDocument(
          storageKey,
          "application/pdf",
          sha256(content),
          (long) content.length
      );
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to store the Surepass PDF", exception);
    }
  }

  private byte[] decodeBase64(String encodedDocument) {
    String base64 = encodedDocument.contains(",")
        ? encodedDocument.substring(encodedDocument.indexOf(',') + 1)
        : encodedDocument;
    if (base64.length() > maxDocumentBytes * 2) {
      throw new IllegalStateException("Surepass PDF exceeds the configured size limit");
    }
    try {
      return Base64.getMimeDecoder().decode(base64);
    } catch (IllegalArgumentException exception) {
      throw new IllegalStateException("Surepass returned an invalid PDF encoding", exception);
    }
  }

  private byte[] downloadPdf(String documentLink) {
    if (documentLink == null || documentLink.isBlank()) {
      throw new IllegalStateException(
          "Surepass response did not include PDF content or a report link"
      );
    }
    URI uri;
    try {
      uri = new URI(documentLink);
    } catch (URISyntaxException exception) {
      throw new IllegalStateException("Surepass returned an invalid report link", exception);
    }
    String host = uri.getHost();
    boolean allowedHost = host != null && (
        host.equals("sandbox.surepass.app")
            || host.endsWith(".surepass.app")
            || host.endsWith(".amazonaws.com")
    );
    if (!"https".equalsIgnoreCase(uri.getScheme()) || !allowedHost) {
      throw new IllegalStateException("Surepass returned an untrusted report link");
    }

    HttpRequest request = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofSeconds(60))
        .header("Accept", "application/pdf,application/octet-stream")
        .GET()
        .build();
    try {
      HttpResponse<byte[]> response = httpClient.send(
          request,
          HttpResponse.BodyHandlers.ofByteArray()
      );
      if (response.statusCode() != 200) {
        throw new IllegalStateException(
            "Surepass report download failed with HTTP " + response.statusCode()
        );
      }
      return response.body();
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Surepass report download was interrupted", exception);
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to download the Surepass PDF", exception);
    }
  }

  public byte[] read(String storageKey) {
    try {
      return Files.readAllBytes(resolve(storageKey));
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to read the stored Surepass PDF", exception);
    }
  }

  public void deleteQuietly(String storageKey) {
    try {
      Files.deleteIfExists(resolve(storageKey));
    } catch (IOException ignored) {
      // A failed database write must not be hidden by cleanup failure.
    }
  }

  private Path resolve(String storageKey) {
    Path resolved = root.resolve(storageKey).normalize();
    if (!resolved.startsWith(root)) {
      throw new IllegalArgumentException("Invalid Surepass document storage key");
    }
    return resolved;
  }

  private boolean startsWith(byte[] content, byte[] prefix) {
    if (content.length < prefix.length) return false;
    for (int index = 0; index < prefix.length; index++) {
      if (content[index] != prefix[index]) return false;
    }
    return true;
  }

  private String sha256(byte[] content) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(content)
      );
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available", exception);
    }
  }

  public record StoredDocument(
      String storageKey,
      String contentType,
      String sha256,
      long sizeBytes
  ) {
  }
}
