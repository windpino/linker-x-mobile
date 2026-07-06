const { exec } = require('child_process');
const fs = require('fs');

console.log('Starting build...');
exec('npx vite build', (error, stdout, stderr) => {
  const result = `
=== STDOUT ===
${stdout}

=== STDERR ===
${stderr}

=== ERROR ===
${error ? error.message : 'No process error'}
`;
  fs.writeFileSync('build_result.log', result);
  console.log('Build completed, results written to build_result.log');
});
