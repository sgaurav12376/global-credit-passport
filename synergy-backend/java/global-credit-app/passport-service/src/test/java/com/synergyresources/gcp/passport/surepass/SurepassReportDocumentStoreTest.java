package com.synergyresources.gcp.passport.surepass;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.synergyresources.gcp.passport.config.SurepassProperties;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SurepassReportDocumentStoreTest {
  @TempDir Path directory;

  @Test
  void storesAndReadsPdfWithoutPersistingBase64() throws Exception {
    byte[] pdf = "%PDF-1.4\nlocal sandbox report".getBytes(StandardCharsets.US_ASCII);
    SurepassReportDocumentStore store = store();

    var saved = store.savePdf(
        UUID.randomUUID(),
        UUID.randomUUID(),
        Base64.getEncoder().encodeToString(pdf),
        null
    );

    assertEquals((long) pdf.length, saved.sizeBytes());
    assertEquals(
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(pdf)),
        saved.sha256()
    );
    assertArrayEquals(pdf, store.read(saved.storageKey()));
  }

  @Test
  void rejectsNonPdfContent() {
    SurepassReportDocumentStore store = store();
    String encoded = Base64.getEncoder().encodeToString(
        "not a pdf".getBytes(StandardCharsets.UTF_8)
    );

    assertThrows(
        IllegalStateException.class,
        () -> store.savePdf(UUID.randomUUID(), UUID.randomUUID(), encoded, null)
    );
  }

  @Test
  void rejectsMissingBase64AndLink() {
    SurepassReportDocumentStore store = store();

    assertThrows(
        IllegalStateException.class,
        () -> store.savePdf(UUID.randomUUID(), UUID.randomUUID(), null, null)
    );
  }

  private SurepassReportDocumentStore store() {
    return new SurepassReportDocumentStore(new SurepassProperties(
        true,
        "https://sandbox.surepass.app",
        "test-token",
        directory.toString(),
        1024 * 1024
    ));
  }
}
