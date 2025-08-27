# com/synergy_resources/credit_app/modules/Auth/signin/routes.py

import os
import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from com.synergy_resources.credit_app.database.models import User

router = APIRouter()

client = boto3.client("cognito-idp", region_name=os.getenv("AWS_REGION"))

class LoginRequest(BaseModel):
    username: str   # email
    password: str

@router.post("/login")
async def login(data: LoginRequest):
    try:
        response = client.initiate_auth(
            ClientId=os.getenv("COGNITO_CLIENT_ID"),
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": data.username,
                "PASSWORD": data.password
            }
        )

        user = await User.get_or_none(email=data.username)
        return {
            "message": "Login successful",
            "id_token": response["AuthenticationResult"]["IdToken"],
            "access_token": response["AuthenticationResult"]["AccessToken"],
            "refresh_token": response["AuthenticationResult"]["RefreshToken"],
            "user": {
                "id": user.id if user else None,
                "name": user.name if user else None,
                "email": user.email if user else None,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
