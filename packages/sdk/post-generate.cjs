/**
 * Simple post-generator to add a small wrapper for auth headers & org header.
 */
const fs = require('fs');
const path = require('path');
const clientPath = path.join(__dirname, 'generated', 'core', 'ApiError.ts');
if (fs.existsSync(clientPath)) {
  let text = fs.readFileSync(clientPath, 'utf-8');
  // no-op placeholder (keep hook point for future patches)
  fs.writeFileSync(clientPath, text, 'utf-8');
}
console.log('SDK generated (post step ok).');
