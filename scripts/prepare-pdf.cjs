const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
const version = require('pdfjs-dist/package.json').version;
const target = path.join(__dirname, '../public/pdfjs');
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(path.join(root, 'legacy/build/pdf.worker.min.mjs'), path.join(target, `pdf.worker.${version}.min.mjs`));
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) fs.cpSync(path.join(root, folder), path.join(target, folder), { recursive: true });
