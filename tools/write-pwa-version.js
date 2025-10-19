const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');

const configPath = path.join(__dirname, '..', 'ngsw-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

config.version = version;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
