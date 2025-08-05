import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig); // <-- MUST come before using any Amplify service

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
