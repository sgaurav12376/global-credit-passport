import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Amplify } from 'aws-amplify';
import awsconfig from '../config/aws-exports';  // aws-exports.js inside src/config

Amplify.configure(awsconfig);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
