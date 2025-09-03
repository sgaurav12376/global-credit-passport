# 🌐 API Gateway - Global Credit App

This is the **API Gateway** service for the Global Credit Application project. It acts as a single entry point for all backend microservices and handles routing, CORS, and potential filters or security configurations using **Spring Cloud Gateway**.

---

## 🛠️ Tech Stack

- Java 17  
- Spring Boot  
- Spring Cloud Gateway  
- Docker  
- Maven  

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/global-credit-score-master.git
cd global-credit-app
```

### 2. Run with Docker Compose

Ensure you're at the root directory and use:

```bash
docker-compose up --build
```
---

## 🔀 Route Configuration

The following routes are defined inside `application.yml`:
```

📌 *These routes forward frontend requests from port `8080` to the appropriate backend services.*

---

## 💡 Example Usage

From frontend (React), make API calls to:

```
http://localhost:8080/api/login
http://localhost:8080/api/register
```

These will be routed by the gateway to:

- `login-service:8082`
- `register-service:8081`

---

## ⚙️ Configuration

You can modify the routing config in:

```
api-gateway/src/main/resources/application.yml
```

Default port: `8080`

---

## 🐳 Dockerfile

```Dockerfile
FROM openjdk:17
COPY target/api-gateway.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```