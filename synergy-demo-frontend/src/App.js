import React, { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { uploadData } from '@aws-amplify/storage';

function AppContent({ signOut, user }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    if (!file || !name) {
      alert("Enter name and choose file");
      return;
    }

    try {
      const fileKey = `${user.username}/${Date.now()}-${file.name}`;

      await uploadData({
        key: fileKey,
        data: file,
        options: {
          contentType: file.type
        }
      }).result;

      // After upload, notify backend
      const backendApiUrl = "https://d094gqwz7a.execute-api.us-east-1.amazonaws.com/dev/upload"; // 🔁 Replace this with your backend URL
      await fetch(backendApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          filename: fileKey,
          docname: name
        })
      });

      setMessage("✅ Uploaded and sent to backend");
      setName('');
      setFile(null);
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📤 Upload Document</h2>
      <p>Welcome, {user.username} | <button onClick={signOut}>Sign out</button></p>

      <input
        type="text"
        placeholder="Enter document name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <br /><br />
      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>
    </div>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <AppContent signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}

