# com/synergy_resources/credit_app/start/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from dotenv import load_dotenv
import os

# Import router with full package path
from com.synergy_resources.credit_app.modules.upload_service.routes import router as upload_router
# from com.synergy_resources.credit_app.modules.login_service.routes import router as login_router  # example future

load_dotenv()  # Load .env vars

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

# CORS - allow your frontend
origins = [
    "http://localhost:3000",
    "http://192.168.56.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST","OPTIONS"],  # Allow all methods (GET, POST, OPTIONS, etc)
    allow_headers=["content-type"],
)

# Register routers
app.include_router(upload_router)
# app.include_router(login_router)  # uncomment when login router ready

# Register DB with Tortoise ORM
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
