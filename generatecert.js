// generateCert.js
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
}

fs.writeFileSync(path.join(sslDir, 'server.key'), pems.private);
fs.writeFileSync(path.join(sslDir, 'server.cert'), pems.cert);

console.log('Self-signed certificates generated in ssl/ directory');
