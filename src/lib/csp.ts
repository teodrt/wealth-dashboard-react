export const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws://localhost:* http://localhost:* https://api.polygon.io https://newsapi.org https://content.guardianapis.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'"
].join("; ");

export const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.polygon.io https://newsapi.org https://content.guardianapis.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'"
].join("; ");
