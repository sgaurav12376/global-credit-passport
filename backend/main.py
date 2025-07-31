import os

from mangum import Mangum
from fastapi import FastAPI, Request, Form
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from tortoise.contrib.fastapi import register_tortoise
from models import Todo
from dotenv import load_dotenv

load_dotenv()  # Load .env variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix for Tortoise ORM scheme issue
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgres://", 1)

app = FastAPI(title="FastAPI To-Do App")
handler = Mangum(app)
# Templates for UI
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


# ======================
# UI ROUTES (Browser)
# ======================
@app.get("/")
async def home(request: Request):
    todos = await Todo.all()
    return templates.TemplateResponse("index.html", {"request": request, "todos": todos})

@app.post("/add")
async def add_task(title: str = Form(...), description: str = Form("")):
    await Todo.create(title=title, description=description)
    return RedirectResponse(url="/", status_code=303)

@app.get("/delete/{todo_id}")
async def delete_task(todo_id: int):
    todo = await Todo.get_or_none(id=todo_id)
    if todo:
        await todo.delete()
    return RedirectResponse(url="/", status_code=303)

@app.get("/toggle/{todo_id}")
async def toggle_task(todo_id: int):
    todo = await Todo.get_or_none(id=todo_id)
    if todo:
        todo.completed = not todo.completed
        await todo.save()
    return RedirectResponse(url="/", status_code=303)


# ======================
# API ROUTES (Postman)
# ======================
@app.get("/api/todos")
async def api_get_todos():
    todos = await Todo.all().values()
    return JSONResponse(content={"todos": list(todos)})

@app.post("/api/todos")
async def api_add_task(title: str = Form(...), description: str = Form("")):
    todo = await Todo.create(title=title, description=description)
    return JSONResponse(content={"message": "Task created", "task": {"id": todo.id, "title": todo.title}})

@app.delete("/api/todos/{todo_id}")
async def api_delete_task(todo_id: int):
    todo = await Todo.get_or_none(id=todo_id)
    if not todo:
        return JSONResponse(content={"error": "Task not found"}, status_code=404)
    await todo.delete()
    return JSONResponse(content={"message": "Task deleted"})

@app.put("/api/todos/{todo_id}/toggle")
async def api_toggle_task(todo_id: int):
    todo = await Todo.get_or_none(id=todo_id)
    if not todo:
        return JSONResponse(content={"error": "Task not found"}, status_code=404)
    todo.completed = not todo.completed
    await todo.save()
    return JSONResponse(content={"message": "Task toggled", "task": {"id": todo.id, "completed": todo.completed}})


# ======================
# Database connection
# ======================
register_tortoise(
    app,
    db_url=DATABASE_URL,
    modules={"models": ["models"]},
    generate_schemas=True,
    add_exception_handlers=True,
)
