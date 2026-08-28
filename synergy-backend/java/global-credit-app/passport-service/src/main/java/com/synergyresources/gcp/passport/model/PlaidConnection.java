package com.synergyresources.gcp.passport.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "plaid_connections")
public class PlaidConnection {
  @Id private UUID id;

  @Column(name = "borrower_id", nullable = false)
  private UUID borrowerId;

  @Column(name = "passport_id")
  private UUID passportId;

  @Column(name = "item_id", nullable = false, unique = true)
  private String itemId;

  @Column(name = "encrypted_access_token", nullable = false, columnDefinition = "TEXT")
  private String encryptedAccessToken;

  @Column(name = "transactions_cursor", columnDefinition = "TEXT")
  private String transactionsCursor;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "identity_accounts", nullable = false, columnDefinition = "jsonb")
  private JsonNode identityAccounts;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "added_transactions", nullable = false, columnDefinition = "jsonb")
  private JsonNode addedTransactions;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "modified_transactions", nullable = false, columnDefinition = "jsonb")
  private JsonNode modifiedTransactions;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "removed_transactions", nullable = false, columnDefinition = "jsonb")
  private JsonNode removedTransactions;

  @Column(nullable = false)
  private String status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  void prePersist() {
    Instant now = Instant.now();
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
    if (status == null) status = "CONNECTED";
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getBorrowerId() { return borrowerId; }
  public UUID getId() { return id; }
  public void setBorrowerId(UUID borrowerId) { this.borrowerId = borrowerId; }
  public UUID getPassportId() { return passportId; }
  public void setPassportId(UUID passportId) { this.passportId = passportId; }
  public String getItemId() { return itemId; }
  public void setItemId(String itemId) { this.itemId = itemId; }
  public String getEncryptedAccessToken() { return encryptedAccessToken; }
  public void setEncryptedAccessToken(String encryptedAccessToken) {
    this.encryptedAccessToken = encryptedAccessToken;
  }
  public String getTransactionsCursor() { return transactionsCursor; }
  public void setTransactionsCursor(String transactionsCursor) {
    this.transactionsCursor = transactionsCursor;
  }
  public JsonNode getIdentityAccounts() { return identityAccounts; }
  public void setIdentityAccounts(JsonNode identityAccounts) {
    this.identityAccounts = identityAccounts;
  }
  public JsonNode getAddedTransactions() { return addedTransactions; }
  public void setAddedTransactions(JsonNode addedTransactions) {
    this.addedTransactions = addedTransactions;
  }
  public JsonNode getModifiedTransactions() { return modifiedTransactions; }
  public void setModifiedTransactions(JsonNode modifiedTransactions) {
    this.modifiedTransactions = modifiedTransactions;
  }
  public JsonNode getRemovedTransactions() { return removedTransactions; }
  public void setRemovedTransactions(JsonNode removedTransactions) {
    this.removedTransactions = removedTransactions;
  }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getCreatedAt() { return createdAt; }
}
