#!/usr/bin/env node

/**
 * Build Verification Tests
 * Tests that the app builds successfully and produces expected output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(name, fn) {
  try {
    log(`\n▶ ${name}`, 'blue');
    fn();
    log(`✓ ${name} - PASSED`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${name} - FAILED`, 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

// Test suite
const tests = [];

// Test 1: Build succeeds
tests.push(() => runTest('Build completes without errors', () => {
  log('  Building project...', 'yellow');
  execSync('npm run build', {
    stdio: 'inherit',
    timeout: 300000 // 5 minutes
  });
}));

// Test 2: Dist folder exists
tests.push(() => runTest('Dist folder is created', () => {
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('dist/ folder not found');
  }
}));

// Test 3: Index.html exists
tests.push(() => runTest('index.html is generated', () => {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html not found');
  }

  const content = fs.readFileSync(indexPath, 'utf-8');
  if (content.length < 100) {
    throw new Error('index.html seems empty or malformed');
  }
}));

// Test 4: JS bundles exist
tests.push(() => runTest('JavaScript bundles are generated', () => {
  const jsPath = path.join(process.cwd(), 'dist', 'js');
  if (!fs.existsSync(jsPath)) {
    throw new Error('dist/js/ folder not found');
  }

  const files = fs.readdirSync(jsPath);
  const jsFiles = files.filter(f => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    throw new Error('No JavaScript bundles found');
  }

  log(`  Found ${jsFiles.length} JS bundle(s)`, 'yellow');
}));

// Test 5: CSS bundles exist
tests.push(() => runTest('CSS bundles are generated', () => {
  const cssPath = path.join(process.cwd(), 'dist', 'css');
  if (!fs.existsSync(cssPath)) {
    throw new Error('dist/css/ folder not found');
  }

  const files = fs.readdirSync(cssPath);
  const cssFiles = files.filter(f => f.endsWith('.css'));

  if (cssFiles.length === 0) {
    throw new Error('No CSS bundles found');
  }

  log(`  Found ${cssFiles.length} CSS bundle(s)`, 'yellow');
}));

// Test 6: Bundle size check
tests.push(() => runTest('Bundle size is reasonable', () => {
  const jsPath = path.join(process.cwd(), 'dist', 'js');
  const files = fs.readdirSync(jsPath);

  let totalSize = 0;
  files.forEach(file => {
    const stats = fs.statSync(path.join(jsPath, file));
    totalSize += stats.size;
  });

  const totalMB = (totalSize / 1024 / 1024).toFixed(2);
  log(`  Total JS size: ${totalMB} MB`, 'yellow');

  // Warn if > 10MB (arbitrary threshold)
  if (totalSize > 10 * 1024 * 1024) {
    log(`  Warning: Bundle size is large (${totalMB} MB)`, 'yellow');
  }
}));

// Run all tests
log('\n═══════════════════════════════════════', 'blue');
log('   BUILD VERIFICATION TESTS', 'blue');
log('═══════════════════════════════════════\n', 'blue');

const results = tests.map(test => test());
const passed = results.filter(r => r).length;
const failed = results.filter(r => !r).length;

log('\n═══════════════════════════════════════', 'blue');
log(`Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
log('═══════════════════════════════════════\n', 'blue');

// Exit with error if any test failed
process.exit(failed > 0 ? 1 : 0);
