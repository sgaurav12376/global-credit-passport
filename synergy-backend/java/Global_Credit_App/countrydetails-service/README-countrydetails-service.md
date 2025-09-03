# 🌍 Country Details Service - Global Credit App

This is the **Country Details Service** in the Global Credit Application project. It returns static country metadata like country code, currency, etc., based on user selection. Built using **Java**, **Spring Boot**, and integrated into a **Spring Cloud Gateway** architecture.

---

## 🛠️ Tech Stack

- Java 17
- Spring Boot (REST API)
- Docker & Docker Compose
- Spring Cloud Gateway (API Gateway)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/global-credit-score-master.git
cd global-credit-app
```

### 2. Build the service

```bash
cd countrydetails-service
mvn clean package
```

### 3. Run using Docker Compose

Make sure you're in the root `global-credit-app/` folder and run:

```bash
docker-compose up --build
```
---

## 🌐 API Endpoints

All routes are accessible via API Gateway.

### `GET /api/countries/India`

Returns metadata for India.

**Response:**
```json
{
  "countryName": "India",
  "countryCode": "IN",
  "currency": "INR"
}
```

---

### `GET /api/countries/USA`

Returns metadata for USA.

**Response:**
```json
{
  "countryName": "USA",
  "countryCode": "US",
  "currency": "USD"
}
```

---

## 🔀 API Gateway Integration

This service is routed through API Gateway:

```
Route: /api/countries/** → http://countrydetails-service:8083
```

Frontend can use:

```bash
http://localhost:8080/api/countries/India
```

---

## ⚙️ Docker

### Dockerfile

```dockerfile
FROM openjdk:17
WORKDIR /app
COPY target/countrydetails-service-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```
