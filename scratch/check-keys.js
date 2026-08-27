const Redis = require('ioredis');
const https = require('https');

const redis = new Redis("redis://localhost:6379");

async function check() {
  try {
    const raw = await redis.get("mogent:gemini_keys_metadata");
    console.log("Metadata in Redis:", raw);

    const keysList = raw ? JSON.parse(raw) : [];
    if (keysList.length > 0) {
      for (const k of keysList) {
        console.log(`\nTesting key: ${k.maskedKey} (${k.name}) - model: ${k.model}`);
        await testKey(k.key);
      }
    } else {
      console.log("No keys in metadata.");
    }
  } catch (err) {
    console.error("Redis Error:", err.message);
  } finally {
    redis.disconnect();
  }
}

function testKey(apiKey) {
  return new Promise((resolve) => {
    https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.models) {
            console.log(`Available models (${json.models.length}):`);
            const supported = json.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.replace('models/', ''));
            console.log(supported.join(', '));
          } else {
            console.log("API Response:", json);
          }
        } catch (e) {
          console.log("Raw Response:", data);
        }
        resolve();
      });
    }).on('error', (e) => {
      console.error("HTTP Error:", e.message);
      resolve();
    });
  });
}

check();
