import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('No API key');
  process.exit(1);
}

try {
  const genAI = new GoogleGenerativeAI(apiKey);
  console.log('Attempting to list models...');
  
  // Try to get model info
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  
  const data = await response.json();
  console.log('Models available:');
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('Error:', err.message);
}
