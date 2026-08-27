const https = require('https');

// Test standard Google models with a test query
const modelsToTest = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-preview-02-05",
  "gemini-2.0-flash",
  "gemini-2.5-flash"
];

console.log("Supported standard Google Gemini API models: ", modelsToTest);
