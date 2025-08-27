# com/synergy_resources/credit_app/start/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from dotenv import load_dotenv
import os

# Routers
from com.synergy_resources.credit_app.modules.Auth.signup.routes import router as signup_router
from com.synergy_resources.credit_app.modules.Auth.signin.routes import router as signin_router
from com.synergy_resources.credit_app.modules.upload_service.routes import router as upload_router

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Synergy Backend API")

# Allow React frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(signup_router, prefix="/auth", tags=["Signup"])
app.include_router(signin_router, prefix="/auth", tags=["Signin"])
app.include_router(upload_router, prefix="/upload", tags=["Upload"])

# Register DB
register_tortoise(
    app,
    db_url=DATABASE_URL,
    modules={"models": ["com.synergy_resources.credit_app.database.models"]},
    generate_schemas=True,
    add_exception_handlers=True,
)

@app.get("/")
async def root():
    return {"message": "Welcome to Synergy Backend API"}
