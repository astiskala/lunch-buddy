const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');

const content = `export const version = {
  version: '${version}'
};
`;

const a = fs.writeFileSync(path.join(__dirname, '..', 'src', 'environments', 'version.ts'), content);
