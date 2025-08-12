# Synergy Backend

This is the backend of the **Global Credit Score** application built with **FastAPI**, **Tortoise ORM**, and **PostgreSQL**. It supports metadata upload from a React frontend hosted on AWS Amplify and stores the data in an RDS database.

---

## 🛠️ Tech Stack

- **FastAPI** – Python web framework
- **Tortoise ORM** – Async ORM for FastAPI
- **PostgreSQL** – Relational Database
- **AWS RDS** – Managed PostgreSQL hosting
- **AWS Amplify** – React frontend hosting
- **Docker** – Containerized deployment (optional)
- **GitHub Actions** – CI/CD setup (optional)

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/global-credit-score-master.git
cd synergy-backend
```
### 2. Create a virtual environment
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```
### 3. Install dependencies
```bash
pip install -r requirements.txt
```
### 4. Run the app
- **Local:** 
```bash
uvicorn main:app --reload
```
- **Production:** 
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
### 4. Visit the API:
```bash
http://18.208.137.85:8000/upload
```

## 🧪 API Endpoint
### POST /upload:
 **Description** –  Save document metadata to the database.
- **Body:**
```bash
{
  "username": "user-id",
  "filename": "file123.pdf",
  "docname": "Passport"
}
```
- **Response:**
```bash
{
  "message": "Saved to DB",
  "id": 1
}
```
## ⚙️ Deployment
You can run this backend:

- **Locally using Uvicorn** 
- **On EC2 with Docker** 
- **With GitHub Actions CI/CD** 
- **Connected to AWS RDS (PostgreSQL)** 

---