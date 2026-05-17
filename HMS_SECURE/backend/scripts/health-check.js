require('dotenv').config();
const http = require('http');
const https = require('https');

const baseUrl = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
const url = `${baseUrl}/api/health/ready`;
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 8000);
const client = url.startsWith('https') ? https : http;

const req = client.get(url, { timeout: timeoutMs }, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`Health OK: ${url}`);
      console.log(body);
      process.exit(0);
    }
    console.error(`Health failed with status ${res.statusCode}: ${body}`);
    process.exit(1);
  });
});
req.on('timeout', () => {
  req.destroy(new Error(`Health check timed out after ${timeoutMs}ms`));
});
req.on('error', (error) => {
  console.error(`Health check failed: ${error.message}`);
  process.exit(1);
});
