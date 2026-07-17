# Global Credit Passport — Local Development Guide

This guide explains how to run the Global Credit Passport (GCP) application locally on macOS.

## Project structure

```text
global-credit-passport/
├── synergy-frontend/                         # React/Vite frontend
└── synergy-backend/
    ├── java/global-credit-app/
    │   ├── api-gateway/                      # Spring Boot API Gateway
    │   ├── passport-service/                 # Spring Boot Passport Service
    │   ├── service-template/                 # Template; do not start
    │   └── docker-compose.gcp.yml            # Local PostgreSQL
    └── python/                               # Python/scoring services
```

## Prerequisites

Install and start:

- Docker Desktop
- Java (the version required by the Maven project)
- Maven
- Node.js and npm

Verify the tools:

```bash
docker --version
docker compose version
java -version
mvn -version
node --version
npm --version
```

## First-time frontend setup

The repository contains `package-lock.json`, so use the locked dependency versions:

```bash
cd /Users/synergy/global-credit-passport/synergy-frontend
npm ci
```

Do not run `npm update`, `npm audit fix --force`, or upgrade dependencies as part of normal startup. Dependency upgrades should be reviewed and tested separately.

## Start the local application

Use a separate Terminal window or tab for every long-running service. Start the services in the following order.

### 1. PostgreSQL

Make sure Docker Desktop is running, then execute:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app
docker compose -f docker-compose.gcp.yml up -d postgres
docker compose -f docker-compose.gcp.yml ps
```

The `gcp-postgres` container should display an `Up` or `healthy` status and expose port `5432`.

### 2. Passport Service

Open another Terminal tab:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app/passport-service
mvn spring-boot:run
```

Wait for the Spring Boot `Started ...Application` message before starting the API Gateway.

### 3. API Gateway

Open another Terminal tab:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app/api-gateway
mvn spring-boot:run
```

Wait for the Spring Boot `Started ...Application` message.

### 4. Python services, when required

First list the configured Python services:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/python
docker compose config --services
```

If the command lists a scoring or risk service, start it with:

```bash
docker compose up --build
```

### 5. Frontend

Open another Terminal tab:

```bash
cd /Users/synergy/global-credit-passport/synergy-frontend
npm run dev
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173
```

## Verify PostgreSQL

Confirm that the container is running:

```bash
docker ps
```

Check whether PostgreSQL is accepting connections:

```bash
docker exec gcp-postgres pg_isready
```

A successful response includes:

```text
accepting connections
```

### Find the configured database and username

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app
docker compose -f docker-compose.gcp.yml config
```

Find the values for `POSTGRES_USER` and `POSTGRES_DB`, then connect with:

```bash
docker exec -it gcp-postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB>
```

Replace the placeholders with the actual configuration values.

### Useful PostgreSQL commands

After entering `psql`:

```sql
SELECT current_database(), current_user, version();
```

```text
\l                 List databases
\dn                List schemas
\dt                List tables in the current schema
\d table_name      Describe a table
\q                 Exit psql
```

Query sample records only after identifying the correct table:

```sql
SELECT * FROM table_name LIMIT 10;
```

Run a query without opening an interactive session:

```bash
docker exec gcp-postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> \
  -c "SELECT current_database(), current_user, NOW();"
```

Avoid `DELETE`, `DROP`, `TRUNCATE`, and `UPDATE` until the intended database, schema, and table have been confirmed.

## Verify the Java services

Each Java terminal should show its configured port in a message similar to:

```text
Tomcat started on port ...
```

If Spring Boot Actuator is enabled, test the relevant port:

```bash
curl http://localhost:<PORT>/actuator/health
```

A healthy service normally responds with:

```json
{"status":"UP"}
```

## Stop the application

Stop the foreground Java, Python, and frontend services by pressing `Control+C` in their respective Terminal tabs.

Stop PostgreSQL with:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app
docker compose -f docker-compose.gcp.yml down
```

This stops and removes the container but normally preserves the named database volume. Do not add `-v` unless you intentionally want to delete local database data.

## Troubleshooting

### Maven reports “Unable to find a suitable main class”

Do not run `mvn spring-boot:run` from `global-credit-app`, because its `pom.xml` is the multi-module parent and does not contain an executable application class.

Run Maven inside the actual service directory:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app/passport-service
mvn spring-boot:run
```

or:

```bash
cd /Users/synergy/global-credit-passport/synergy-backend/java/global-credit-app/api-gateway
mvn spring-boot:run
```

Do not start `service-template`; it is a development template rather than an active application service.

### PostgreSQL connection refused

Check Docker and PostgreSQL:

```bash
docker ps
docker exec gcp-postgres pg_isready
docker logs gcp-postgres --tail 100
```

Confirm that the Java datasource username, password, database, hostname, and port agree with `docker-compose.gcp.yml`.

### Port already in use

On macOS, identify the process using a port:

```bash
lsof -nP -iTCP:<PORT> -sTCP:LISTEN
```

Confirm the process before stopping it.

### Copy long error output

Display output while saving it:

```bash
mvn spring-boot:run 2>&1 | tee /tmp/gcp-maven-output.txt
```

Copy the saved output to the macOS clipboard:

```bash
pbcopy < /tmp/gcp-maven-output.txt
```

## Normal daily startup summary

1. Start Docker Desktop.
2. Start PostgreSQL using `docker-compose.gcp.yml`.
3. Start `passport-service` with Maven.
4. Start `api-gateway` with Maven.
5. Start required Python services.
6. Start the Vite frontend with `npm run dev`.

