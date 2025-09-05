# 📦 Register Service - Global Credit App

This is the **Register Service** for the Global Credit Application project. It is built using **Java**, **Spring Boot**, and **PostgreSQL**, and is part of a microservices architecture managed via **Spring Cloud Gateway** and **Docker Compose**.

---

## 🛠️ Tech Stack

- Java 21
- Spring Boot (REST API)
- Spring Data JPA & Hibernate
- PostgreSQL
- Docker & Docker Compose
- Maven

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/global-credit-score-master.git
cd global-credit-app
```

### 2. Build the project

```bash
mvn clean install
```

### 3. Run with Docker (preferred)

Make sure you are at the root `global-credit-app/` directory and use:

```bash
docker-compose up --build
```

---

## 🌐 API Endpoint

### POST `/api/register`

Registers a new user into the system.

#### Request Body (JSON)

```json
{
  "email": "user@example.com",
  "phoneNumber": "1234567890",
  "password": "yourpassword",
  "confirmPassword": "yourpassword",
  "firstName": "John",
  "lastName": "Doe",
  "passportNumber": "P1234567"
}
```

#### Response (on success)

```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### Response (on failure)

```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

## 🧪 Running Tests

To run unit tests (if implemented):

```bash
mvn test
```

---

## 🔀 API Gateway Integration

This service is accessible through the API Gateway:

```
Route: /api/register → http://register-service:8081
```

Requests from the frontend (React) can directly hit `http://localhost:8080/api/register` and will be forwarded via gateway.

---

## ⚙️ Configuration

Environment variables (used in `docker-compose.yml`):

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-db:5432/synergydb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=admin
```

Or define directly in `application.properties`.

---

## 📦 Docker Image

This service can be containerized using:

```Dockerfile
FROM openjdk:21
COPY target/register-service.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

---
