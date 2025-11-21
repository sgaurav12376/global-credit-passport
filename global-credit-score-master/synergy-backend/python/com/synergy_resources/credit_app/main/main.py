# com/synergy_resources/credit_app/main/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from dotenv import load_dotenv
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Routers
from com.synergy_resources.credit_app.modules.auth.signup_manual.manual_signup_routes import router as man_signup_router
from com.synergy_resources.credit_app.modules.auth.signin.signin_routes import router as signin_router
from com.synergy_resources.credit_app.modules.auth.signup_auto.auto_signup_routes import router as auto_signup_router


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgres://", 1)
    if "?sslmode=" in DATABASE_URL or "&sslmode=" in DATABASE_URL:
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
        parsed = urlparse(DATABASE_URL)
        query_params = parse_qs(parsed.query)
        if 'sslmode' in query_params:
            ssl_required = query_params['sslmode'][0].lower() in ['require', 'prefer']
            del query_params['sslmode']
            new_query = urlencode(query_params, doseq=True)
            DATABASE_URL = urlunparse(parsed._replace(query=new_query))

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
if DATABASE_URL:
    try:
        register_tortoise(
            app,
            db_url=DATABASE_URL,
            modules={"models": ["com.synergy_resources.credit_app.database.models"]},
            generate_schemas=True,
            add_exception_handlers=True,
        )
        logger.info("Database connection registered successfully")
    except Exception as e:
        logger.warning(f"Failed to register database connection: {str(e)}")
        logger.warning("Application will continue without database connection")
else:
    logger.warning("DATABASE_URL not set. Application will run without database connection.")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Synergy Backend API",
        "status": "running",
        "database_connected": DATABASE_URL is not None
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment verification"""
    health_status = {
        "status": "healthy",
        "service": "synergy-python-backend",
        "database_connected": DATABASE_URL is not None
    }
    
    if not DATABASE_URL:
        health_status["warning"] = "DATABASE_URL not configured"
    
    return health_status
