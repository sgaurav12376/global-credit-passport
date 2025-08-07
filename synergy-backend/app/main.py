from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from tortoise.contrib.fastapi import register_tortoise
from app.database.models import Document
from dotenv import load_dotenv
import os

load_dotenv()  # 👈 Load .env file

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

# Allow frontend URL to access backend
origins = [
    "https://main.d2fjsliszpnqh4.amplifyapp.com",  # <-- your React dev server
]

# ✅ CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["content-type"],
)


# ✅ Pydantic schema
class UploadMetadata(BaseModel):
    username: str
    filename: str
    docname: str

# ✅ Save document route
@app.post("/upload")
async def receive_upload_data(data: UploadMetadata):
    try:
        print("✅ Received data:", data)
        document = await Document.create(
            username=data.username,
            filename=data.filename,
            docname=data.docname,
        )
        return {"message": "Saved to DB", "id": document.id}
    except Exception as e:
        print("❌ ERROR:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})

# ✅ Connect PostgreSQL from .env
register_tortoise(
    app,
    db_url=DATABASE_URL,
    modules={"models": ["app.database.models"]},
    generate_schemas=True,
    add_exception_handlers=True,
)
