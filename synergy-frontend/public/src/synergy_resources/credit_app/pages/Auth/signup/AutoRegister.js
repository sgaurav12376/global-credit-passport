import React, { useState } from "react";

export default function AutoRegister() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Please upload a document first!");
    const formData = new FormData();
    formData.append("id_file", file);

    const res = await fetch("http://localhost:8001/api/register-auto", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    console.log("Extracted Data:", data);
    alert("User Registered Automatically!");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h2 className="text-xl font-bold mb-4">Automatic Registration</h2>
      <input type="file" className="mb-4" onChange={handleFileChange} />
      <button onClick={handleUpload} className="bg-green-600 text-white py-2 px-4 rounded">
        Upload & Register
      </button>
    </div>
  );
}