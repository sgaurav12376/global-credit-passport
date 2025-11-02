package com.global_credit_app.DataServiceApplication.repo;

import com.global_credit_app.DataServiceApplication.dto.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = { "spring.sql.init.mode=never" })
class DataQueryRepositoryIT {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void dbProps(DynamicPropertyRegistry registry) {
        POSTGRES.start();
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired DataQueryRepository repo;

    @BeforeEach
    void setupSchema() {
        jdbc.execute(" DROP TABLE IF EXISTS public.plaid_trans_counterparties;");
        jdbc.execute(" DROP TABLE IF EXISTS public.plaid_transaction_data; ");
        jdbc.execute(" DROP TABLE IF EXISTS public.customer_details; ");
        jdbc.execute(" DROP TABLE IF EXISTS public.indian_credit_data; ");

        jdbc.execute("""
            CREATE TABLE public.customer_details (
              customer_id TEXT,
              owner_names TEXT,
              emails TEXT,
              phone_numbers TEXT,
              street TEXT,
              city TEXT,
              region TEXT,
              postal_code TEXT,
              account_name TEXT,
              account_type TEXT,
              account_subtype TEXT,
              account_number TEXT,
              current_balance NUMERIC,
              available_balance NUMERIC,
              credit_limit NUMERIC,
              currency_code TEXT
            );
        """);

        jdbc.execute("""
            CREATE TABLE public.plaid_transaction_data (
              date DATE,
              name TEXT,
              amount NUMERIC,
              pending BOOLEAN,
              website TEXT,
              logo_url TEXT,
              account_id TEXT,
              merchant_name TEXT,
              transaction_id TEXT,
              authorized_date DATE,
              payment_channel TEXT,
              transaction_type TEXT,
              iso_currency_code TEXT,
              merchant_entity_id TEXT,
              personal_finance_category_icon_url TEXT,
              personal_finance_category_primary TEXT,
              personal_finance_category_detailed TEXT,
              personal_finance_category_confidence_level TEXT,
              transaction_pk BIGSERIAL PRIMARY KEY
            );
        """);

        jdbc.execute("""
            CREATE TABLE public.plaid_trans_counterparties (
              name TEXT,
              type TEXT,
              website TEXT,
              logo_url TEXT,
              entity_id TEXT,
              phone_number TEXT,
              confidence_level TEXT,
              transaction_pk BIGINT
            );
        """);

        jdbc.execute("""
            CREATE TABLE public.indian_credit_data (
              id BIGSERIAL PRIMARY KEY,
              full_name TEXT,
              credit_score INT,
              report_order_time TIMESTAMP NULL
            );
        """);

        // Seed accounts
        jdbc.batchUpdate("""
            INSERT INTO public.customer_details
              (customer_id, account_name, account_type, account_subtype, account_number, current_balance, available_balance, credit_limit, currency_code)
            VALUES
              ('CUST1','Alice Checking','checking','standard','A-001',  500.00,  700.00, NULL, 'USD'),
              ('CUST2','Bob Credit',   'credit', 'card',    'B-001',  1200.00, 1200.00, 2000.00, 'USD');
        """);

        // Seed transactions (some recent, some older)
        jdbc.batchUpdate("""
            INSERT INTO public.plaid_transaction_data
              (date, name, amount, pending, account_id, merchant_name, transaction_type, personal_finance_category_primary)
            VALUES
              (CURRENT_DATE - INTERVAL '10 days','POS',   50.00,false,'A-001','Store1','card','Shopping'),
              (CURRENT_DATE - INTERVAL '5 days','ATM',   20.00,false,'A-001','ATM','cash','Cash'),
              (CURRENT_DATE - INTERVAL '1 days','CARD',  80.00,false,'B-001','Shop','card','Shopping');
        """);

        // Seed scores with timestamps so "latest per person" applies
        jdbc.batchUpdate("""
            INSERT INTO public.indian_credit_data (full_name, credit_score, report_order_time) VALUES
              ('Alice', 760, CURRENT_TIMESTAMP - INTERVAL '30 days'),
              ('Alice', 780, CURRENT_TIMESTAMP - INTERVAL '1 days'),
              ('Bob',   710, CURRENT_TIMESTAMP - INTERVAL '2 days'),
              ('Charlie', 810, CURRENT_TIMESTAMP - INTERVAL '10 days');
        """);
    }

    @Test
    void findAccounts_readsFromCustomerDetails() {
        List<AccountDTO> accounts = repo.findAccounts(null, null);
        assertThat(accounts).hasSize(2);
        assertThat(accounts.get(0).accountId()).isNotBlank();
    }

    @Test
    void getAccountMix_calculatesShares() {
        AccountMixResponseDTO dto = repo.getAccountMix();
        assertThat(dto.totalAccounts()).isGreaterThan(0);
        assertThat(dto.entries()).isNotEmpty();
        assertThat(dto.totalExposure()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    void getActiveAccounts_last90Days() {
        ActiveAccountsDTO dto = repo.getActiveAccounts();
        assertThat(dto.activeAccounts()).isEqualTo(2); // A-001 and B-001
    }

    @Test
    void getGlobalScore_latestPerPerson() {
        GlobalScoreDTO dto = repo.getGlobalScore();
        assertThat(dto.globalScore()).isBetween(300, 900);
        assertThat(dto.band()).isNotBlank();
    }

    @Test
    void getCreditAge_works() {
        CreditAgeDTO dto = repo.getCreditAge();
        assertThat(dto.oldestMonths()).isGreaterThanOrEqualTo(0);
    }

    @Test
    void getPaymentHistory_placeholder() {
        PaymentHistoryDTO dto = repo.getPaymentHistory();
        assertThat(dto.totalAccounts()).isZero();
        assertThat(dto.onTimeRatio()).isNull();
    }
}
