from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import boto3, os

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr = None
    phone: str = None
    password: str

@router.post("/")
async def login(data: LoginRequest):
    COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
    AWS_REGION = os.getenv("AWS_REGION")

    if not COGNITO_CLIENT_ID or not AWS_REGION:
        raise RuntimeError("Missing COGNITO_CLIENT_ID or AWS_REGION environment variable")

    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Email or phone required")

    username = data.email if data.email else data.phone
    client = boto3.client("cognito-idp", region_name=AWS_REGION)

    try:
        resp = client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": data.password
            }
        )
        return {
            "access_token": resp["AuthenticationResult"]["AccessToken"],
            "id_token": resp["AuthenticationResult"]["IdToken"],
            "refresh_token": resp["AuthenticationResult"]["RefreshToken"],
            "token_type": "bearer"
        }

    except client.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    except client.exceptions.UserNotFoundException:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
