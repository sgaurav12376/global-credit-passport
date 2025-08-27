import React, { useState } from "react";

export default function ManualRegister() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Manual Register Data:", form);
    // send to backend API
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h2 className="text-xl font-bold mb-4">Manual Registration</h2>
      <form className="flex flex-col space-y-3 w-80" onSubmit={handleSubmit}>
        <input className="p-2 border rounded" name="name" placeholder="Name" onChange={handleChange} />
        <input className="p-2 border rounded" name="email" placeholder="Email" onChange={handleChange} />
        <input className="p-2 border rounded" name="phone" placeholder="Phone" onChange={handleChange} />
        <input className="p-2 border rounded" name="password" placeholder="Password" type="password" onChange={handleChange} />
        <button type="submit" className="bg-blue-600 text-white py-2 rounded">Register</button>
      </form>
    </div>
  );
}