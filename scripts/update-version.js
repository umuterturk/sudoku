#!/usr/bin/env node

/**
 * Version Update Script for Sudoku Game
 * Updates version numbers in package.json and service worker to force cache invalidation
 */

const fs = require('fs');
const path = require('path');

function updateVersion() {
  try {
    // Read package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Increment patch version
    const versionParts = packageJson.version.split('.');
    const patchVersion = parseInt(versionParts[2]) + 1;
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;
    
    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Updated package.json version to ${newVersion}`);
    
    // Update service worker version
    const swPath = path.join(__dirname, '..', 'public', 'sw.js');
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Update CACHE_NAME and APP_VERSION
    const newCacheName = `sudoku-game-v${patchVersion}`;
    swContent = swContent.replace(
      /const CACHE_NAME = '[^']+';/,
      `const CACHE_NAME = '${newCacheName}';`
    );
    swContent = swContent.replace(
      /const APP_VERSION = '[^']+';/,
      `const APP_VERSION = '${newVersion}';`
    );
    
    fs.writeFileSync(swPath, swContent);
    
    console.log(`✅ Updated service worker cache name to ${newCacheName}`);
    console.log(`✅ Updated service worker app version to ${newVersion}`);
    
    // Create a version file for the build
    const versionPath = path.join(__dirname, '..', 'dist', 'version.json');
    const versionData = {
      version: newVersion,
      buildTime: new Date().toISOString(),
      cacheName: newCacheName
    };
    
    // Ensure dist directory exists
    const distDir = path.dirname(versionPath);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
    console.log(`✅ Created version file at ${versionPath}`);
    
    console.log('\n🚀 Cache invalidation setup complete!');
    console.log('   - Package version updated');
    console.log('   - Service worker cache name updated');
    console.log('   - Version file created for build');
    console.log('\n💡 Users will now get fresh assets on next visit!');
    
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

// Run the update
updateVersion();
