import os
import boto3
from botocore.exceptions import ClientError

AWS_REGION = os.getenv("AWS_REGION")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")

client = boto3.client("cognito-idp", region_name=AWS_REGION)


def sign_up_user(email: str, phone: str, password: str, name: str):
    """
    Registers a new user in Cognito.
    """
    try:
        response = client.sign_up(
            ClientId=COGNITO_CLIENT_ID,
            Username=email,
            Password=password,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "phone_number", "Value": f"+91{phone}"},
                {"Name": "name", "Value": name},
            ],
        )
        return response
    except ClientError as e:
        raise ValueError(e.response["Error"]["Message"])


def login_user(username: str, password: str):
    """
    Authenticates user with Cognito (email or phone).
    """
    try:
        response = client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": password
            }
        )
        return response["AuthenticationResult"]
    except ClientError as e:
        raise ValueError(e.response["Error"]["Message"])


def get_current_user(access_token: str):
    """
    Gets user attributes from Cognito using access token.
    """
    try:
        resp = client.get_user(AccessToken=access_token)
        return {
            "username": resp["Username"],
            "attributes": {attr["Name"]: attr["Value"] for attr in resp["UserAttributes"]}
        }
    except ClientError as e:
        raise ValueError(e.response["Error"]["Message"])


def confirm_user(email: str):
    """
    (Optional) Admin confirm signup, bypassing email/phone OTP.
    Requires AWS credentials with admin rights.
    """
    try:
        response = client.admin_confirm_sign_up(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email
        )
        return response
    except ClientError as e:
        raise ValueError(e.response["Error"]["Message"])
