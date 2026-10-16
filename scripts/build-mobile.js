const { execSync } = require('child_process');

process.env.CAPACITOR_BUILD = 'true';

console.log('🚀 Building static production bundle for Capacitor...');
execSync('npx next build', {
  stdio: 'inherit',
  env: { ...process.env, CAPACITOR_BUILD: 'true' }
});

console.log('📱 Syncing with Android Capacitor project...');
execSync('npx cap sync android', {
  stdio: 'inherit'
});

console.log('✅ Mobile build and Android sync complete!');
