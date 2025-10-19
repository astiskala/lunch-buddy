const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');

const templatePath = path.join(__dirname, '..', 'ngsw-config.template.json');
const config = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

config.version = version;

const outputPath = path.join(__dirname, '..', 'ngsw-config.json');
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
