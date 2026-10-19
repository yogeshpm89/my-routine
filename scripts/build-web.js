const { execSync } = require('child_process');

console.log('🚀 Building static production bundle for Firebase Hosting...');
execSync('npx next build', {
  stdio: 'inherit',
  env: { ...process.env, CAPACITOR_BUILD: 'true' }
});

console.log('✅ Web build complete in out/ directory!');
