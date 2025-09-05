# 🌍 Global Credit Application

This is a microservices-based **Java Full Stack** project called **Global Credit Application**, developed using **Spring Boot**, **Spring Cloud Gateway**, **Docker**, **React.js**, and **PostgreSQL**.
---

## 🧩 Project Structure

```
global-credit-app/
├── login-service/
├── register-service/
├── countrydetails-service/   # (to be re-added)
├── api-gateway/
├── frontend/                 # React.js frontend (runs via npm)
├── docker-compose.yml
```

---

## 🛠️ Tech Stack

- Java 21
- Spring Boot (Microservices)
- Spring Cloud Gateway
- PostgreSQL with Dockerized DB
- React.js (Frontend)
- Docker & Docker Compose
- Maven

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/global-credit-score-master.git
cd global-credit-app
```

### 2. Build the services

```bash
mvn clean install
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

This command builds and starts all services, including:

- `login-service`
- `register-service`
- `api-gateway`
- `postgres-db`

Frontend runs separately using:

```bash
cd frontend
npm install
npm start
```

### 4. Access the app

- **API Gateway:** [http://localhost:8080](http://localhost:8080)
- **Frontend (React):** [http://localhost:3000](http://localhost:3000)

---

## 🧪 API Endpoints via Gateway

- `POST /api/register` → Register a new user
- `POST /api/login` → Login with email or phone
- `GET /api/countries/**` → Country service (planned)

---

## 📂 Individual Service Readmes

Each service (login, register, gateway) has its own `README.md` in the corresponding folder with service-specific instructions.

---

## 🐳 Docker Notes

Database and services are containerized.

```bash
docker-compose down --volumes   # Stop & remove containers and volumes
```

---

## 🛡️ Security & Future Scope

- Implement JWT token generation during login
- Protect routes using Spring Security and API Gateway filters
- Add countrydetails-service with caching and pagination
- Integrate cloud-based hosting (e.g.,AWS )

---

## 👨‍💻 Author

Developed by Bharath Datta Sai Singanamala  
MS in Information Technology, University of North Texas  
Intern at Synergy Resources LLC

---
