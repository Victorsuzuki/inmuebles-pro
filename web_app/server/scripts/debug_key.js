const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const key = process.env.GOOGLE_PRIVATE_KEY;

console.log('--- DEBUG KEY ---');
if (!key) {
    console.log('KEY IS MISSING OR NULL');
} else {
    console.log('Key length:', key.length);
    // Check for literal \n (backslash + n)
    const hasLiteralBackslashN = key.includes('\\n');
    console.log('Has literal \\n:', hasLiteralBackslashN);
    // Check for actual newlines
    const hasRealNewlines = key.includes('\n');
    console.log('Has real newlines:', hasRealNewlines);
    console.log('First 50 chars:', key.substring(0, 50));
    console.log('Last 50 chars:', key.substring(key.length - 50));

    // Try parsing like sheetService
    const formattedKey = key.replace(/\\n/g, '\n');
    console.log('\n--- FORMATTED KEY ---');
    console.log('Formatted Key length:', formattedKey.length);
    console.log('Formatted Key has literal \\n:', formattedKey.includes('\\n'));
    console.log('Formatted Key has real newlines:', formattedKey.includes('\n'));
    console.log('Formatted Key First 50 chars:', formattedKey.substring(0, 50));
    console.log('Formatted Key Last 50 chars:', formattedKey.substring(formattedKey.length - 50));
}
console.log('--- END DEBUG ---');
