#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

/**
 * Scans CSS files for any non-monochrome color values (hex, rgb, hsl).
 * Fails with code 1 if any saturated color is detected.
 */
function isHexMonochrome(hex) {
  let clean = hex.replace('#', '');
  if (clean.length === 3 || clean.length === 4) {
    return clean[0].toLowerCase() === clean[1].toLowerCase() && clean[1].toLowerCase() === clean[2].toLowerCase();
  }
  if (clean.length === 6 || clean.length === 8) {
    const r = clean.slice(0, 2).toLowerCase();
    const g = clean.slice(2, 4).toLowerCase();
    const b = clean.slice(4, 6).toLowerCase();
    return r === g && g === b;
  }
  return true; // Not a standard color hex
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  // Patterns
  const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
  const rgbPattern = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  const hslPattern = /hsla?\(\s*[\d.]+\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/g;

  lines.forEach((line, index) => {
    // Ignore comments or URLs
    const cleanLine = line.split('/*')[0].replace(/url\([^)]+\)/g, '');

    // Check Hex
    let match;
    while ((match = hexPattern.exec(cleanLine)) !== null) {
      if (!isHexMonochrome(match[0])) {
        violations.push({ line: index + 1, value: match[0], rule: 'hex saturation > 0' });
      }
    }

    // Check RGB
    while ((match = rgbPattern.exec(cleanLine)) !== null) {
      const [, r, g, b] = match;
      if (r !== g || g !== b) {
        violations.push({ line: index + 1, value: match[0] + ')', rule: 'rgb channels unequal' });
      }
    }

    // Check HSL
    while ((match = hslPattern.exec(cleanLine)) !== null) {
      const [, s, l] = match;
      if (parseFloat(s) > 0 && parseFloat(l) > 0 && parseFloat(l) < 100) {
        violations.push({ line: index + 1, value: match[0] + ')', rule: 'hsl saturation > 0' });
      }
    }
  });

  return violations;
}

function findCssFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        findCssFiles(fullPath, fileList);
      }
    } else if (entry.name.endsWith('.css')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const cssFiles = findCssFiles('./src');
let totalViolations = 0;

console.log(`[CI Monochrome Check] Scanning ${cssFiles.length} CSS files...`);

for (const file of cssFiles) {
  const violations = checkFile(file);
  if (violations.length > 0) {
    totalViolations += violations.length;
    console.error(`\n❌ Non-monochrome colors found in ${file}:`);
    for (const v of violations) {
      console.error(`   Line ${v.line}: ${v.value} (${v.rule})`);
    }
  }
}

if (totalViolations > 0) {
  console.error(`\n[CI Monochrome Check] FAILED: ${totalViolations} non-monochrome color violation(s) found.`);
  process.exit(1);
} else {
  console.log('✅ [CI Monochrome Check] PASSED: All CSS colors are strictly monochrome (black, white, neutral grays).');
  process.exit(0);
}
