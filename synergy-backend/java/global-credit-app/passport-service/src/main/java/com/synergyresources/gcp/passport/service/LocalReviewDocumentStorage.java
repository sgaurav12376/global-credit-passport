package com.synergyresources.gcp.passport.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalReviewDocumentStorage implements ReviewDocumentStorage {
  private final Path root;

  public LocalReviewDocumentStorage(
      @Value("${gcp.review-documents.local-dir:./data/review-documents}") String directory
  ) {
    root = Path.of(directory).toAbsolutePath().normalize();
  }

  @Override
  public StoredDocument store(UUID shareId, UUID requestId, MultipartFile file) throws IOException {
    Path directory = root.resolve(shareId.toString()).resolve(requestId.toString()).normalize();
    if (!directory.startsWith(root)) throw new IOException("Invalid document storage path");
    Files.createDirectories(directory);
    String key = shareId + "/" + requestId + "/" + UUID.randomUUID();
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root)) throw new IOException("Invalid document storage path");
    try (var input = file.getInputStream()) {
      Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
    }
    String filename = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
    String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
    return new StoredDocument(key, filename, contentType, file.getSize());
  }

  @Override
  public Resource load(String storageKey) {
    Path target = root.resolve(storageKey).normalize();
    if (!target.startsWith(root) || !Files.isRegularFile(target)) {
      throw new IllegalArgumentException("Document is unavailable");
    }
    return new FileSystemResource(target);
  }
}
