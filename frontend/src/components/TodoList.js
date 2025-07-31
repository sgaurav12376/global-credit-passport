export default function TodoList({ todos, onToggle, onDelete }) {
  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id} className={todo.completed ? "completed" : ""}>
          <span>
            <strong>{todo.title}</strong> - {todo.description}
          </span>
          <button onClick={() => onToggle(todo.id)}>
            {todo.completed ? "Undo" : "Complete"}
          </button>
          <button onClick={() => onDelete(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
