# com/synergy_resources/credit_app/start/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from dotenv import load_dotenv
import os

# Routers
from com.synergy_resources.credit_app.modules.auth.signup_manual.manual_signup_routes import router as man_signup_router
from com.synergy_resources.credit_app.modules.auth.signin.signin_routes import router as signin_router
from com.synergy_resources.credit_app.modules.auth.signup_auto.auto_signup_routes import router as auto_signup_router


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Synergy Backend API")

# CORS Middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(man_signup_router, prefix="/auth/signup_manual", tags=["Signup_manual"])
app.include_router(signin_router, prefix="/auth/signin", tags=["Signin"])
app.include_router(auto_signup_router, prefix="/auth/signup_auto", tags=["signup_auto"])

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
