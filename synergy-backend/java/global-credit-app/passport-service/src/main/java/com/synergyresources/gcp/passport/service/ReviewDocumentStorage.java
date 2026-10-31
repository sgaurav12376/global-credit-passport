package com.synergyresources.gcp.passport.service;

import java.io.IOException;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface ReviewDocumentStorage {
  StoredDocument store(UUID shareId, UUID requestId, MultipartFile file) throws IOException;
  Resource load(String storageKey);

  record StoredDocument(String storageKey, String filename, String contentType, long sizeBytes) {}
}
