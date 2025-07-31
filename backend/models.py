from tortoise import fields
from tortoise.models import Model

class Todo(Model):
    id = fields.IntField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    completed = fields.BooleanField(default=False)

    def __str__(self):
        return self.title
