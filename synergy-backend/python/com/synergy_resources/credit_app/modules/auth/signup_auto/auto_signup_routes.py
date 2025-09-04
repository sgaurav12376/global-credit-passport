import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from com.synergy_resources.credit_app.storage.s3 import upload_file_to_s3
from com.synergy_resources.credit_app.database.models import SynergyCreditApp
from com.synergy_resources.credit_app.modules.auth.cognito.cognito_service import get_current_user

router = APIRouter()

BUCKET_NAME = os.getenv("AWS_S3_BUCKET")

@router.post("/register-auto")
async def register_auto(
    doc_type: str = Form(...),
    id_number: str = Form(...),
    file: UploadFile = File(...),
    authorization: str = Header(...)
):
    try:
        # ✅ Verify user from Cognito instead of trusting form email
        token = authorization.replace("Bearer ", "").strip()
        user_info = get_current_user(token)
        email = user_info["attributes"].get("email")

        if not email:
            raise HTTPException(status_code=400, detail="User email not found in Cognito")

        # ✅ Lookup local user
        user = await SynergyCreditApp.get_or_none(email=email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found in local DB. Please sign up first.")

        # ✅ Upload file to S3
        s3_key = f"documents/{user.id}/{file.filename}"
        upload_file_to_s3(file.file, BUCKET_NAME, s3_key)

        # ✅ Save document in DB (store id_number too if needed)
        doc = await SynergyCreditApp.create(
            user=user,
            filename=file.filename,
            s3_key=s3_key,
            doc_type=doc_type,
            id_number=id_number  # ⚡ add this field if your Document model supports it
        )

        return {
            "message": "Document uploaded successfully",
            "user_id": user.id,
            "document_id": doc.id,
            "s3_path": s3_key
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
