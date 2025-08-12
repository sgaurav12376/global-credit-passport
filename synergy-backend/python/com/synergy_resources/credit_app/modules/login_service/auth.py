# synergy-backend/login_service/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError

router = APIRouter()

cognito_client = boto3.client('cognito-idp', region_name='us-east-1')  # update region

USER_POOL_ID = 'us-east-1_uSNSFBk7q*'
CLIENT_ID = '6eujj4a610sc3ra1vbbl6jd1js*'

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(data: LoginRequest):
    try:
        resp = cognito_client.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': data.email,
                'PASSWORD': data.password,
            }
        )
        return {
            "message": "Login successful",
            "id_token": resp['AuthenticationResult']['IdToken'],
            "access_token": resp['AuthenticationResult']['AccessToken'],
            "refresh_token": resp['AuthenticationResult']['RefreshToken'],
        }
    except ClientError as e:
        raise HTTPException(status_code=401, detail=e.response['Error']['Message'])
