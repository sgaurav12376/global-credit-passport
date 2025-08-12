# upload_service/routes.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from com.synergy_resources.credit_app.database.models import Document
from fastapi.responses import JSONResponse

router = APIRouter()

class UploadMetadata(BaseModel):
    username: str
    filename: str
    docname: str

@router.post("/upload")
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
