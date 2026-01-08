# Global Credit Passport - Complete Project Explanation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Frontend (React + Vite)](#frontend-react--vite)
4. [Backend Services](#backend-services)
5. [Data Flow](#data-flow)
6. [Authentication Flow](#authentication-flow)
7. [Dashboard Features](#dashboard-features)
8. [Deployment](#deployment)
9. [File Structure Deep Dive](#file-structure-deep-dive)

---

## 1. Project Overview

**Global Credit Passport** is a comprehensive credit scoring application that:
- Calculates and displays credit scores across multiple countries
- Normalizes credit scores between different countries (e.g., India → USA)
- Provides detailed credit analytics and insights
- Manages user authentication and registration
- Stores and processes financial data

**Key Technologies:**
- **Frontend**: React 19, Vite, React Router
- **Backend**: FastAPI (Python), Spring Boot (Java)
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: AWS Cognito
- **Deployment**: AWS (Amplify, EC2, API Gateway, RDS)

---

## 2. Architecture Overview

The project follows a **microservices architecture** with multiple layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│              AWS Amplify (Hosted)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/REST API
                     │
┌────────────────────▼────────────────────────────────────┐
│              API Gateway (Spring Boot)                   │
│                  Port: 8080                             │
└─────┬──────┬──────┬──────┬──────────────────────────────┘
      │      │      │      │
      │      │      │      │
┌─────▼──┐ ┌─▼────┐ ┌─▼────┐ ┌─▼──────────┐
│ Login  │ │Regist│ │Country│ │   Data    │
│Service │ │ration│ │Details│ │  Service  │
│ :8082  │ │:8081 │ │ :8083 │ │  :8085    │
└────────┘ └──────┘ └───────┘ └───────────┘
      │      │      │      │
      └──────┴──────┴──────┴──────┐
                                   │
                          ┌────────▼────────┐
                          │  PostgreSQL RDS │
                          │   (AWS RDS)     │
                          └─────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Python FastAPI Service (Separate)               │
│         - Manual Signup                                  │
│         - Auto Signup                                    │
│         - Signin                                         │
│         - Uses Tortoise ORM + PostgreSQL                 │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Frontend (React + Vite)

### 3.1 Project Structure

```
synergy-frontend/
├── src/
│   ├── App.jsx                    # Main app router
│   ├── main.jsx                   # Entry point
│   └── synergy_resources/
│       └── credit_app/
│           ├── components/        # Reusable UI components
│           ├── context/          # React Context (Auth)
│           ├── pages/            # Page components
│           └── services/         # API service functions
```

### 3.2 Key Components

#### **App.jsx** - Main Router
- Sets up React Router with protected routes
- Defines public routes (`/login`, `/signup`)
- Defines protected dashboard routes (all under `/`)
- Uses `AuthProvider` for global authentication state
- Uses `ProtectedRoute` wrapper for authentication checks

**Route Structure:**
- `/login` → Login page (public)
- `/signup` → Signup page (public)
- `/` → Redirects to `/score`
- `/score` → Global Score dashboard
- `/payment-history` → Payment history analytics
- `/utilization` → Credit utilization metrics
- `/credit-length` → Credit age analysis
- `/account-mix` → Account type distribution
- `/active-accounts` → List of active accounts
- `/inquiries` → Credit inquiry history
- `/adverse-records` → Negative records
- `/recent-behavior` → Recent account behavior
- `/alt-data` → Alternative data sources
- `/banking` → Banking activity
- `/country-normalization` → Cross-country normalization

#### **AuthContext.jsx** - Authentication State Management
- Simple in-memory auth state with `sessionStorage` persistence
- Functions: `signin()`, `signout()`
- Persists auth state across page refreshes using `sessionStorage`

#### **ProtectedRoute.jsx** - Route Protection
- Wraps protected routes
- Checks if user is authenticated
- Redirects to `/login` if not authenticated

#### **Dashboard Components**
- **GlobalScore.jsx**: Main dashboard showing:
  - Origin country score (e.g., India)
  - Destination country score (e.g., USA)
  - Global combined score (average)
  - Interactive gauge visualizations
  - Flip cards showing score reasons
  - Quick links to all dashboard pages

- **CreditGauge.jsx**: Visual gauge component for credit scores
- **Sidebar.jsx**: Navigation sidebar
- **Topbar.jsx**: Top navigation bar with country selector
- **Footer.jsx**: Footer component

### 3.3 API Services

**dashboardApi.js**: Functions to fetch dashboard data:
- `getCreditScore(userId)`
- `getUtilization(userId)`
- `getPaymentHistory(userId)`

**authApi.js**: Authentication API calls

---

## 4. Backend Services

### 4.1 Java Microservices (Spring Boot)

The Java backend consists of 5 microservices orchestrated through an API Gateway:

#### **A. API Gateway** (`api-gateway/`)
- **Port**: 8080
- **Purpose**: Single entry point for all microservices
- **Technology**: Spring Cloud Gateway
- **Routing**:
  - `/api/register/**` → Register Service (8081)
  - `/api/login/**` → Login Service (8082)
  - `/api/countries/**` → Country Details Service (8083)
  - `/api/data/**` → Data Service (8085)
  - `/api/dashboard-data/**` → Data Service (8085)

**Configuration** (`application.yml`):
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: register-service
          uri: http://register-service:8081
          predicates:
            - Path=/api/register/**
```

#### **B. Register Service** (`register-service/`)
- **Port**: 8081
- **Purpose**: User registration
- **Features**:
  - Creates user in AWS Cognito
  - Stores user metadata in PostgreSQL
  - Validates user input
  - Returns registration confirmation

**Key Classes**:
- `RegisterController`: REST endpoints
- `RegisterService`: Business logic
- `CognitoClient`: AWS Cognito integration
- `UserRepository`: Database operations

#### **C. Login Service** (`login-service/`)
- **Port**: 8082
- **Purpose**: User authentication
- **Features**:
  - Authenticates users via AWS Cognito
  - Returns JWT tokens (access, ID, refresh)
  - Handles login errors

**Key Classes**:
- `LoginController`: REST endpoints
- `LoginService`: Authentication logic
- `CognitoClient`: AWS Cognito integration

#### **D. Country Details Service** (`countrydetails-service/`)
- **Port**: 8083
- **Purpose**: Country-specific information
- **Features**:
  - Returns country details
  - Provides country normalization data

#### **E. Data Service** (`data-service/`)
- **Port**: 8085
- **Purpose**: Credit data and analytics
- **Features**:
  - Fetches credit scores (origin, destination, global)
  - Provides utilization data
  - Returns payment history
  - Account mix analytics
  - Active accounts data
  - Credit age information
  - Adverse records

**Key Classes**:
- `DashboardDataController`: Dashboard endpoints
- `DataService`: Business logic
- `DataQueryRepository`: Database queries
- DTOs: `GlobalScoreDTO`, `UtilizationDTO`, `PaymentHistoryDTO`, etc.

### 4.2 Python FastAPI Service

**Location**: `synergy-backend/python/`

#### **Main Application** (`main/main.py`)
- FastAPI application with CORS middleware
- Registers routers for authentication
- Connects to PostgreSQL using Tortoise ORM
- Auto-generates database schemas

**Routers**:
1. **Manual Signup** (`/auth/signup_manual/`)
   - User registration with manual data entry
   - Creates Cognito user
   - Saves metadata to PostgreSQL

2. **Auto Signup** (`/auth/signup_auto/`)
   - Automated signup process

3. **Signin** (`/auth/signin/`)
   - User login via AWS Cognito
   - Returns JWT tokens

#### **Database Models** (`database/models.py`)
- **SynergyCreditApp**: User metadata model
  - Fields: `id`, `cognito_sub`, `name`, `email`, `phone`, `dob`, `id_type`, `id_number`
  - Maps to PostgreSQL table `synergy_credit_app`

#### **Authentication Modules**
- **Cognito Service**: AWS Cognito integration
- **Signin Routes**: Login endpoint
- **Signup Routes**: Registration endpoints

### 4.3 Data Engineering Module

**Location**: `synergy-backend/python/dataengineering/`

**Purpose**: Financial data processing and transformation

**Modules**:
- `client.py`: API client
- `db.py`: Database operations
- `products/`: Product-specific modules:
  - `assets.py`: Asset data
  - `auth.py`: Authentication
  - `identity.py`: Identity verification
  - `investments.py`: Investment data
  - `liabilities.py`: Liability data
  - `payrollincome.py`: Payroll/income data
  - `recurring.py`: Recurring transactions
  - `statements.py`: Bank statements
  - `transactions.py`: Transaction data

---

## 5. Data Flow

### 5.1 User Registration Flow

```
1. User fills signup form (Frontend)
   ↓
2. POST /auth/signup_manual/ (Python FastAPI)
   ↓
3. Check if email exists in PostgreSQL
   ↓
4. Create user in AWS Cognito
   ↓
5. Get Cognito UserSub
   ↓
6. Save user metadata to PostgreSQL (SynergyCreditApp table)
   ↓
7. Return success response
```

### 5.2 User Login Flow

```
1. User enters credentials (Frontend)
   ↓
2. POST /auth/signin/ (Python FastAPI)
   ↓
3. Authenticate with AWS Cognito
   ↓
4. Receive JWT tokens (Access, ID, Refresh)
   ↓
5. Store tokens in frontend (sessionStorage/localStorage)
   ↓
6. Update AuthContext (set authed = true)
   ↓
7. Redirect to dashboard
```

### 5.3 Dashboard Data Flow

```
1. User navigates to dashboard (Frontend)
   ↓
2. GET /api/data/scores (API Gateway → Data Service)
   ↓
3. Data Service queries PostgreSQL
   ↓
4. Returns JSON:
   {
     "origin": 680,
     "destination": 720
   }
   ↓
5. Frontend calculates combined score: (680 + 720) / 2 = 700
   ↓
6. Displays scores in gauges and KPIs
```

### 5.4 Credit Score Calculation

The system calculates three types of scores:

1. **Origin Score**: Credit score in the user's origin country
2. **Destination Score**: Credit score normalized to destination country
3. **Global Score**: Average of origin and destination scores

**Score Bands**:
- **Poor**: 0-579
- **Fair**: 580-669
- **Good**: 670-739
- **Very Good**: 740-799
- **Excellent**: 800-1000

---

## 6. Authentication Flow

### 6.1 AWS Cognito Integration

Both Java and Python services integrate with AWS Cognito:

**Cognito Configuration**:
- User Pool ID: `us-east-1_dRmaCVKxV`
- App Client ID: `r55hcm1utobr91qsv6r0r8uva`
- Region: `us-east-1`

**Authentication Methods**:
1. **USER_PASSWORD_AUTH**: Username/password authentication
2. **Sign Up**: Creates new user in Cognito
3. **Token Management**: Access tokens, ID tokens, refresh tokens

### 6.2 Frontend Authentication

**AuthContext** manages authentication state:
- `authed`: Boolean state
- `signin()`: Sets authed = true, stores in sessionStorage
- `signout()`: Sets authed = false, clears sessionStorage

**Protected Routes**:
- All dashboard routes are wrapped in `<ProtectedRoute>`
- Unauthenticated users are redirected to `/login`

---

## 7. Dashboard Features

### 7.1 Global Score Page

**Features**:
- **Three Score Displays**:
  - Origin country score (with flag)
  - Destination country score (with flag)
  - Global combined score
  
- **Interactive Gauges**:
  - Click to flip and see score reasons
  - Visual gauge representation
  - Color-coded by score band

- **Quick Links Grid**:
  - Links to all dashboard pages
  - Icons and descriptions

- **KPI Cards**:
  - Score values
  - Progress bars
  - Score bands

### 7.2 Other Dashboard Pages

1. **Payment History**: On-time payment rates, delinquencies
2. **Utilization**: Credit used vs. available limit
3. **Credit Length**: Average and oldest account age
4. **Account Mix**: Distribution across credit types
5. **Active Accounts**: List of all active accounts
6. **Inquiries**: Hard credit pulls history
7. **Adverse Records**: Collections, write-offs, bankruptcies
8. **Recent Behavior**: New accounts, spending patterns
9. **Alt-Data**: Alternative data sources (phone, utilities)
10. **Banking**: Cash flow signals from bank activity
11. **Country Normalization**: Cross-country score alignment

---

## 8. Deployment

### 8.1 Infrastructure

**AWS Services Used**:
- **Amplify**: Frontend hosting
- **EC2**: Backend services (Java microservices)
- **RDS**: PostgreSQL database
- **API Gateway**: API routing (or Spring Cloud Gateway)
- **Cognito**: User authentication

### 8.2 Deployment Files

**appspec.yml**: AWS CodeDeploy configuration
- Defines deployment hooks:
  - `BeforeInstall`: Setup scripts
  - `AfterInstall`: Installation scripts
  - `ApplicationStart`: Start application

**Docker Compose** (`docker-compose.yml`):
- Orchestrates all Java microservices
- Defines network: `global-credit-network`
- Environment variables for database connection
- Health checks for each service

**Deployment Scripts** (`scripts/`):
- `before_install.sh`: Pre-installation setup
- `after_install.sh`: Post-installation tasks
- `start_app.sh`: Application startup
- Python-specific scripts for Python service

### 8.3 Environment Variables

**Java Services**:
- `SPRING_DATASOURCE_URL`: PostgreSQL connection string
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `AWS_REGION`: AWS region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_COGNITO_USERPOOL_ID`: Cognito user pool ID
- `AWS_COGNITO_APP_CLIENT_ID`: Cognito app client ID

**Python Service**:
- `DATABASE_URL`: PostgreSQL connection string
- `COGNITO_CLIENT_ID`: Cognito app client ID
- `AWS_REGION`: AWS region

---

## 9. File Structure Deep Dive

### 9.1 Frontend Structure

```
synergy-frontend/
├── public/                    # Static assets
├── src/
│   ├── App.jsx               # Main router
│   ├── main.jsx              # React entry point
│   ├── styles.css            # Global styles
│   └── synergy_resources/
│       └── credit_app/
│           ├── components/   # Reusable components
│           │   ├── AuthLayout.jsx
│           │   ├── CountrySelect.jsx
│           │   ├── CreditGauge.jsx
│           │   ├── Footer.jsx
│           │   ├── PageHeader.jsx
│           │   ├── ProtectedRoute.jsx
│           │   ├── Sidebar.jsx
│           │   ├── Toaster.jsx
│           │   └── Topbar.jsx
│           ├── context/
│           │   └── AuthContext.jsx    # Auth state management
│           ├── pages/
│           │   ├── Auth/
│           │   │   ├── signin/Login.jsx
│           │   │   └── signup/Signup.jsx
│           │   └── dashboard/         # All dashboard pages
│           └── services/
│               ├── authApi.js         # Auth API calls
│               └── dashboardApi.js    # Dashboard API calls
├── package.json
├── vite.config.js
└── README.md
```

### 9.2 Backend Java Structure

```
synergy-backend/java/Global_Credit_App/
├── api-gateway/              # API Gateway service
├── login-service/           # Login service
├── register-service/        # Registration service
├── countrydetails-service/  # Country details service
├── data-service/            # Data/analytics service
├── docker-compose.yml       # Docker orchestration
└── pom.xml                  # Parent Maven POM
```

**Each Service Contains**:
- `src/main/java/`: Java source code
  - `controller/`: REST controllers
  - `service/`: Business logic
  - `repository/`: Data access
  - `dto/`: Data transfer objects
  - `model/`: Entity models
  - `config/`: Configuration classes
- `src/main/resources/`: Configuration files
  - `application.yml` or `application.properties`
- `Dockerfile`: Docker build instructions
- `pom.xml`: Maven dependencies

### 9.3 Backend Python Structure

```
synergy-backend/python/
├── com/
│   └── synergy_resources/
│       └── credit_app/
│           ├── main/
│           │   └── main.py           # FastAPI app entry
│           ├── database/
│           │   ├── models.py         # Tortoise ORM models
│           │   ├── database.py       # DB connection
│           │   └── migrate.py        # Migrations
│           ├── modules/
│           │   ├── auth/
│           │   │   ├── cognito/      # Cognito integration
│           │   │   ├── signin/       # Login routes
│           │   │   ├── signup_auto/  # Auto signup
│           │   │   └── signup_manual/# Manual signup
│           │   └── dashboard_service/
│           └── storage/
│               └── s3.py              # S3 integration
├── dataengineering/         # Data processing modules
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker build
└── README.md
```

---

## 10. Key Technologies & Libraries

### Frontend
- **React 19**: UI framework
- **Vite**: Build tool and dev server
- **React Router 7**: Client-side routing
- **pdfjs-dist**: PDF rendering
- **tesseract.js**: OCR capabilities
- **react-country-flag**: Country flag display

### Backend Java
- **Spring Boot 3.1.3**: Framework
- **Spring Cloud Gateway**: API Gateway
- **Spring Data JPA**: Database access
- **PostgreSQL Driver**: Database connectivity
- **AWS SDK**: Cognito integration
- **Maven**: Dependency management

### Backend Python
- **FastAPI**: Web framework
- **Tortoise ORM**: Async ORM
- **PostgreSQL (psycopg2)**: Database driver
- **Boto3**: AWS SDK for Python
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server

### Database
- **PostgreSQL**: Relational database
- **AWS RDS**: Managed PostgreSQL hosting

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **AWS Amplify**: Frontend hosting
- **AWS EC2**: Backend hosting
- **AWS RDS**: Database hosting
- **AWS Cognito**: Authentication service

---

## 11. Development Workflow

### 11.1 Local Development

**Frontend**:
```bash
cd synergy-frontend
npm install
npm run dev  # Starts Vite dev server
```

**Backend Java**:
```bash
cd synergy-backend/java/Global_Credit_App
docker-compose up  # Starts all microservices
```

**Backend Python**:
```bash
cd synergy-backend/python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn com.synergy_resources.credit_app.main.main:app --reload
```

### 11.2 Testing

**Java Services**:
- Unit tests in `src/test/java/`
- Integration tests for repositories
- Controller tests

**Python Service**:
- FastAPI test client
- Database integration tests

---

## 12. Security Considerations

1. **Authentication**: AWS Cognito handles user authentication
2. **Authorization**: Protected routes check authentication state
3. **CORS**: Configured in FastAPI and Spring Boot
4. **Database**: SSL connections to RDS
5. **Environment Variables**: Sensitive data stored in environment variables
6. **Tokens**: JWT tokens for API authentication

---

## 13. Future Enhancements

Potential improvements:
- Real-time credit score updates
- Multi-factor authentication
- Advanced analytics and ML-based predictions
- Mobile app support
- Additional country support
- Enhanced data visualization
- API rate limiting
- Comprehensive logging and monitoring

---

## Summary

The **Global Credit Passport** is a full-stack application that:
1. **Authenticates users** via AWS Cognito
2. **Stores user data** in PostgreSQL
3. **Calculates credit scores** across multiple countries
4. **Normalizes scores** between countries
5. **Displays analytics** through an interactive dashboard
6. **Deploys** on AWS infrastructure

The architecture separates concerns with:
- **Frontend**: React application for user interface
- **Backend Java**: Microservices for core business logic
- **Backend Python**: FastAPI service for authentication
- **Database**: PostgreSQL for data persistence
- **Infrastructure**: AWS services for hosting and authentication

This modular approach allows for scalability, maintainability, and independent deployment of services.


