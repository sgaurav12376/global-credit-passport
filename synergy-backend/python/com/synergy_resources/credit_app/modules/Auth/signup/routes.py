# com/synergy_resources/credit_app/modules/Auth/signup/routes.py

import os
import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from com.synergy_resources.credit_app.database.models import User

router = APIRouter()

client = boto3.client("cognito-idp", region_name=os.getenv("AWS_REGION"))

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: EmailStr
    dob: str
    password: str
    id_type: str
    id_number: str

@router.post("/register")
async def register(data: RegisterRequest):
    try:
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

        # Store in DB
        user = await User.create(
            cognito_sub=cognito_sub,
            name=data.name,
            email=data.email,
            phone=data.phone,
            dob=data.dob,
            id_type=data.id_type,
            id_number=data.id_number,
        )

        return {"message": "User registered successfully", "user_id": user.id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
