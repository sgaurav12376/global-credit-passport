# com/synergy_resources/credit_app/modules/upload_service/routes.py

import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from com.synergy_resources.credit_app.utils.s3 import upload_file_to_s3
from com.synergy_resources.credit_app.database.models import User, Document

router = APIRouter()

BUCKET_NAME = os.getenv("AWS_S3_BUCKET")

@router.post("/register-auto")
async def register_auto(
    email: str = Form(...),
    doc_type: str = Form(...),
    id_number: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        user = await User.get_or_none(email=email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found. Please sign up first.")

        s3_key = f"documents/{user.id}/{file.filename}"
        upload_file_to_s3(file.file, BUCKET_NAME, s3_key)

        doc = await Document.create(
            user=user,
            filename=file.filename,
            s3_key=s3_key,
            doc_type=doc_type,
        )

        return {
            "message": "Document uploaded successfully",
            "user_id": user.id,
            "document_id": doc.id,
            "s3_path": s3_key
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
