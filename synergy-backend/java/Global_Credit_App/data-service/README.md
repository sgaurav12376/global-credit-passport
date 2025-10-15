# 📊 Data-Service

Spring Boot microservice that reads analytics and credit data from **AWS RDS (PostgreSQL)** and exposes UI-friendly JSON for the **Global Credit App Dashboard**.

---

## 🚀 Overview
This service powers all backend dashboard APIs such as accounts, utilization, account mix, global score, and credit age.  
It was originally reading from local PL/SQL views, but now fully connects to **AWS RDS** and uses the following tables:
- `public.customer_data_test`
- `public.transaction_detailed`
- `public.indian_credit_data`

---

## ✅ Endpoints in `DataController`
All of these endpoints are **live** (they read directly from RDS now):

| HTTP Method | Endpoint | Description | Backing Table(s) |
|--------------|-----------|--------------|------------------|
| **GET** | `/api/data/accounts` | Fetch all accounts, optionally filtered by `type` and `subtype`. | `public.customer_data_test` |
| **GET** | `/api/data/utilization` | Revolving utilization ratio — currently **placeholder (null)** until balance / limit data is available. | — (TODO: will use new balance/limit table) |
| **GET** | `/api/data/account-mix` | Distribution of exposure by category (`transaction_type_main`). | `public.transaction_detailed` |
| **GET** | `/api/data/active-accounts` | Number of accounts with transactions in the last 90 days and their total exposure. | `public.transaction_detailed` |
| **GET** | `/api/data/global-score` | Average credit score + qualitative banding. | `public.indian_credit_data` |
| **GET** | `/api/data/credit-age` | Oldest and average account age (months between first & latest transactions). | `public.transaction_detailed` |
| **GET** | `/api/data/payment-history` | Placeholder — returns zero counts until delinquency data available. | — (TODO) |

---

## ✅ Dashboard Endpoint in `DashboardDataController`

| HTTP Method | Endpoint | Description | Returns |
|--------------|-----------|--------------|----------|
| **GET** | `/api/dashboard-data/overview` | Consolidated snapshot for the dashboard (fetches all sub-modules internally). | `{ accounts, utilization, accountMix, activeAccounts, creditAge, paymentHistory, globalScore }` |

---

## ⚙️ Prerequisites

| Component | Description |
|------------|-------------|
| **Database** | AWS RDS PostgreSQL instance (`synergy-db.c8lmu0ou87wx.us-east-1.rds.amazonaws.com`) |
| **DB Credentials** | `postgres / synergy123` |
| **Schema** | `public` |
| **JDK** | 21 (Eclipse Temurin or OpenJDK) |
| **Build Tool** | Maven 3.9 + |

---

## 🧰 Build & Run (Local)

```bash
# Ensure JDK 21 is active
java -version
mvn -v

# Run with AWS RDS connection
mvn -U clean spring-boot:run \
  -Dspring-boot.run.jvmArguments="\
  -DDB_URL=jdbc:postgresql://synergy-db.c8lmu0ou87wx.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require \
  -DDB_USER=postgres \
  -DDB_PASS=synergy123"
