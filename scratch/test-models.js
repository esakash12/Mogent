const https = require('https');

// Let's test with the API keys from Redis or test a simple query
const testKey = process.env.GEMINI_API_KEY || "AIzaSyDummy";

async function listModels(key) {
  return new Promise((resolve, reject) => {
    https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

console.log("Ready to test models");
