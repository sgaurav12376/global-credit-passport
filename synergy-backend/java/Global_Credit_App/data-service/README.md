data-service

Spring Boot microservice that reads JSON-derived analytics views from Postgres (synergydb) and exposes UI-friendly JSON for the Global Credit App dashboard.

Endpoints

GET /api/data/accounts?type=&subtype= – list of accounts with balances/limits

GET /api/data/utilization – revolving utilization % across credit accounts

GET /api/data/account-mix – normalized account mix and diversity index (HHI)

GET /api/data/active-accounts – total active accounts and total exposure

GET /api/dashboard-data/overview – consolidated payload for dashboard (accounts + utilization)

These endpoints read views in the analytics schema that sit on top of your raw.* JSON tables. Make sure you created those views first.

Prerequisites

Postgres container: postgres-db

Database: synergydb (default user:  postgres / password: admin)

JSON already loaded into the eight raw.*_json tables (one row per document)

Views created (see SQL pack we defined: vw_accounts, vw_revolving_utilization, vw_account_mix, vw_active_accounts)

Build & Run (local)
# Ensure JDK 17 is used by both Maven and IDE
java -version
javac -version
mvn -v

# Run with local Postgres, override URL if needed
mvn -U clean spring-boot:run \
-Dspring-boot.run.jvmArguments="-DDB_URL=jdbc:postgresql://localhost:5432/synergydb -DDB_USER=postgres -DDB_PASS=admin"

Example Requests
Accounts
curl "http://localhost:8085/api/data/accounts"
curl "http://localhost:8085/api/data/accounts?type=depository"
curl "http://localhost:8085/api/data/accounts?subtype=checking"
curl "http://localhost:8085/api/data/accounts?type=credit"

Utilization
curl "http://localhost:8085/api/data/utilization"

Account Mix
curl "http://localhost:8085/api/data/account-mix"

Active Accounts
curl "http://localhost:8085/api/data/active-accounts"

Dashboard Overview (accounts + utilization together)
curl "http://localhost:8085/api/dashboard-data/overview"

Global score 
curl "http://localhost:8085/api/data/global-score"

Credit-Age
GET http://localhost:8085/api/data/credit-age

Payment History
GET http://localhost:8085/api/data/payment-history

overveiw
GET http://localhost:8085/api/dashboard-data/overview
