import axios from "axios";

const API_BASE_URL = "https://em45vpvf35ym5rdizybew3wviu0nehlv.lambda-url.us-east-1.on.aws/api"; 
// Change this to http://127.0.0.1:8000/api when running locally.

export const getTodos = () => axios.get(`${API_BASE_URL}/todos`);
export const addTodo = (title, description) =>
  axios.post(`${API_BASE_URL}/todos`, new URLSearchParams({ title, description }));
export const toggleTodo = (id) => axios.put(`${API_BASE_URL}/todos/${id}/toggle`);
export const deleteTodo = (id) => axios.delete(`${API_BASE_URL}/todos/${id}`);
