const fs = require('fs');
const path = require('path');

const projectRoot = 'f:\\Project\\INEVITGEN\\IBG_Dev';

const filesToConvert = [
  'build.log',
  'build_error.log',
  'build_output.log',
  'build_utf8.log'
];

filesToConvert.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf16le');
      const outPath = path.join(projectRoot, 'scratch', file.replace(/\.log$/, '_utf8.txt'));
      fs.writeFileSync(outPath, content, 'utf8');
      console.log(`Successfully converted ${file} to UTF-8`);
    } catch (err) {
      console.error(`Error converting ${file}:`, err);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
