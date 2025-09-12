#!/usr/bin/env node
// Build optimization script for Sudoku Game

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build optimizations...');

// Function to analyze bundle size
function analyzeBundleSize() {
  const distPath = path.join(__dirname, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run npm run build first.');
    return;
  }
  
  const assetsPath = path.join(distPath, 'assets');
  const files = fs.readdirSync(assetsPath);
  
  console.log('\n📊 Bundle Analysis:');
  console.log('='.repeat(50));
  
  let totalSize = 0;
  const fileAnalysis = [];
  
  files.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalSize += stats.size;
    
    fileAnalysis.push({
      name: file,
      size: sizeKB,
      type: path.extname(file)
    });
  });
  
  // Sort by size (descending)
  fileAnalysis.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  
  fileAnalysis.forEach(file => {
    const icon = file.type === '.js' ? '📦' : file.type === '.css' ? '🎨' : '📄';
    console.log(`${icon} ${file.name}: ${file.size} KB`);
  });
  
  console.log('='.repeat(50));
  console.log(`📏 Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`💾 Gzipped estimate: ~${(totalSize / 1024 / 3).toFixed(2)} KB`);
  
  // Recommendations
  console.log('\n💡 Optimization Recommendations:');
  if (totalSize > 500 * 1024) {
    console.log('⚠️  Bundle size > 500KB - consider further code splitting');
  }
  if (fileAnalysis.some(f => f.type === '.js' && parseFloat(f.size) > 200)) {
    console.log('⚠️  Large JS chunks found - consider lazy loading more components');
  }
  if (fileAnalysis.some(f => f.type === '.css' && parseFloat(f.size) > 50)) {
    console.log('⚠️  Large CSS files found - consider CSS purging');
  }
  
  console.log('✅ Bundle analysis complete!');
}

// Function to optimize puzzle databases (if needed)
function optimizePuzzleDatabases() {
  console.log('\n🧩 Checking puzzle database sizes...');
  
  const dbPath = path.join(__dirname, 'src', 'game_database');
  const dbFiles = ['easy.js', 'medium.js', 'hard.js', 'expert.js'];
  
  dbFiles.forEach(file => {
    const filePath = path.join(dbPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`📊 ${file}: ${sizeKB} KB`);
    }
  });
  
  console.log('💡 Puzzle databases are dynamically loaded - good for performance!');
}

// Function to add cache-busting headers to built files
function addCacheBustingHeaders() {
  console.log('\n🔄 Adding cache-busting optimizations...');
  
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run npm run build first.');
    return;
  }
  
  // Create a version file with build timestamp
  const versionData = {
    version: require('./package.json').version,
    buildTime: new Date().toISOString(),
    timestamp: Date.now()
  };
  
  const versionPath = path.join(distPath, 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
  console.log('✅ Created version.json for cache busting');
  
  // Update index.html with cache-busting meta tags if not already present
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Add cache-busting meta tags if not present
    if (!htmlContent.includes('Cache-Control')) {
      const metaTags = `
    <!-- Cache control meta tags -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">`;
      
      htmlContent = htmlContent.replace(
        '<meta name="theme-color" content="#667eea">',
        `<meta name="theme-color" content="#667eea">${metaTags}`
      );
      
      fs.writeFileSync(indexPath, htmlContent);
      console.log('✅ Added cache-busting meta tags to index.html');
    }
  }
  
  console.log('✅ Cache-busting optimizations complete!');
}

// Main execution
if (require.main === module) {
  analyzeBundleSize();
  optimizePuzzleDatabases();
  addCacheBustingHeaders();
  
  console.log('\n🎯 Optimization Tips:');
  console.log('• Use npm run build for production builds');
  console.log('• Use npm run deploy:force to force cache invalidation');
  console.log('• Enable gzip compression on your server');
  console.log('• Consider CDN for static assets');
  console.log('• Monitor Core Web Vitals in production');
  console.log('• Check browser dev tools for cache issues');
}

module.exports = { analyzeBundleSize, optimizePuzzleDatabases };
