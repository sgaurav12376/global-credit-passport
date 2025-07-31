import { useEffect, useState } from "react";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";
import { getTodos, addTodo, toggleTodo, deleteTodo } from "./api";
import "./App.css";

export default function App() {
  const [todos, setTodos] = useState([]);

  const fetchTodos = async () => {
    try {
      const response = await getTodos();
      setTodos(response.data.todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
    }
  };

  const handleAdd = async (title, description) => {
    await addTodo(title, description);
    fetchTodos();
  };

  const handleToggle = async (id) => {
    await toggleTodo(id);
    fetchTodos();
  };

  const handleDelete = async (id) => {
    await deleteTodo(id);
    fetchTodos();
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div className="App">
      <h1>FastAPI + React To-Do List</h1>
      <TodoForm onAdd={handleAdd} />
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
}
