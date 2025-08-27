# com/synergy_resources/credit_app/database/models.py

from tortoise.models import Model
from tortoise import fields

class User(Model):
    id = fields.IntField(pk=True)
    cognito_sub = fields.CharField(max_length=100, unique=True)
    name = fields.CharField(max_length=100)
    email = fields.CharField(max_length=200, unique=True, null=True)
    phone = fields.CharField(max_length=15, unique=True, null=True)
    dob = fields.CharField(max_length=20, null=True)
    id_type = fields.CharField(max_length=50, null=True)
    id_number = fields.CharField(max_length=50, null=True)

    def __str__(self):
        return self.name


class Document(Model):
    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="documents")
    filename = fields.CharField(max_length=255)
    s3_key = fields.CharField(max_length=255)
    doc_type = fields.CharField(max_length=50)

    def __str__(self):
        return self.filename
