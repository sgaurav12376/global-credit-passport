from tortoise.models import Model
from tortoise import fields

class Document(Model):
    id = fields.IntField(pk=True)
    username = fields.CharField(max_length=255)
    filename = fields.CharField(max_length=255)
    docname = fields.CharField(max_length=255)
   

    def __str__(self):
        return self.filename
