import React, { useState } from 'react';
import * as Auth from '@aws-amplify/auth';
import * as Storage from '@aws-amplify/storage';

export default function UploadPage({ user, setUser }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSignOut = async () => {
    try {
      await Auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleUpload = async () => {
    if (!file || !name) {
      alert('Enter document name and choose a file');
      return;
    }
    try {
      const fileKey = `${user.username}/${Date.now()}-${file.name}`;

      // Correct usage of Storage.uploadData
      await Storage.uploadData({
        key: fileKey,
        data: file,
        contentType: file.type,
      });

      const backendApiUrl = 'https://d094gqwz7a.execute-api.us-east-1.amazonaws.com/dev';

      await fetch(backendApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          filename: fileKey,
          docname: name,
        }),
      });

      setMessage('✅ Uploaded and sent to backend');
      setName('');
      setFile(null);
    } catch (err) {
      console.error('Upload error:', err);
      setMessage('❌ Upload failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📤 Upload Document</h2>
      <p>
        Welcome, {user.username} | <button onClick={handleSignOut}>Sign out</button>
      </p>

      <input
        type="text"
        placeholder="Enter document name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: '8px', width: '300px', marginBottom: '12px' }}
      />
      <br />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginBottom: '20px' }}
      />
      <br />
      <button onClick={handleUpload} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        Upload
      </button>

      <p>{message}</p>
    </div>
  );
}
