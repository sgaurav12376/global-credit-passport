from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from com.synergy_resources.credit_app.database.models import SynergyCreditApp
import os, boto3

router = APIRouter()

# Cognito client
client = boto3.client("cognito-idp", region_name=os.getenv("AWS_REGION"))

# -----------------------------
# Pydantic model
# -----------------------------
class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: EmailStr
    dob: str
    password: str
    id_type: str = Field(..., alias="idType")
    id_number: str = Field(..., alias="idNumber")

    class Config:
        allow_population_by_field_name = True
        orm_mode = True

# -----------------------------
# Routes
# -----------------------------
@router.post("/")
async def register(data: RegisterRequest):
    try:
        # 1️⃣ Check if email already exists
        existing_user = await SynergyCreditApp.get_or_none(email=data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # 2️⃣ Cognito signup
        response = client.sign_up(
            ClientId=os.getenv("COGNITO_CLIENT_ID"),
            Username=data.email,
            Password=data.password,
            UserAttributes=[
                {"Name": "name", "Value": data.name},
                {"Name": "phone_number", "Value": f"+91{data.phone}"},
                {"Name": "email", "Value": data.email},
            ],
        )
        cognito_sub = response["UserSub"]

        # 3️⃣ Save metadata in local DB
        user = await SynergyCreditApp.create(
            cognito_sub=cognito_sub,
            name=data.name,
            email=data.email,
            phone=data.phone or None,
            dob=data.dob or None,
            id_type=data.id_type or None,
            id_number=data.id_number or None,
        )

        return {
            "message": "User registered successfully",
            "user_id": user.id,
            "cognito_sub": cognito_sub
        }

    except client.exceptions.UsernameExistsException:
        raise HTTPException(status_code=400, detail="User already exists in Cognito")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
