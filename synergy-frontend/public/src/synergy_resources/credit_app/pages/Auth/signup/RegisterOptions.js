import React from "react";
import { Link } from "react-router-dom";

export default function RegisterOptions() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Choose Registration Method</h1>
      <div className="flex space-x-6">
        <Link to="/ManualRegister">
          <button className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">
            Manual Register
          </button>
        </Link>
        <Link to="/AutoRegister">
          <button className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600">
            Automatic Register
          </button>
        </Link>
      </div>
    </div>
  );
}