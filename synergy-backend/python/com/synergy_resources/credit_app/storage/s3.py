# com/synergy_resources/credit_app/utils/s3.py

import boto3
import os
from botocore.exceptions import NoCredentialsError

s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

def upload_file_to_s3(file_obj, bucket_name, s3_key):
    try:
        s3_client.upload_fileobj(file_obj, bucket_name, s3_key)
        return f"s3://{bucket_name}/{s3_key}"
    except NoCredentialsError:
        raise Exception("AWS credentials not found")
