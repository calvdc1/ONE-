const { execSync } = require('node:child_process');
const port = process.env.PORT && /^\d+$/.test(process.env.PORT) ? process.env.PORT : '3000';
const host = process.env.HOST || '0.0.0.0';
execSync(`npx next start -p ${port} -H ${host}`, { stdio: 'inherit' });
