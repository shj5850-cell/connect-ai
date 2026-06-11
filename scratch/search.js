const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/extension.ts');
const query = process.argv[2];
const isRegex = process.argv[3] === 'true';

if (!query) {
    console.error('Usage: node search.js <query> [isRegex]');
    process.exit(1);
}

console.log(`Searching for "${query}" in ${filePath}...`);
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
let count = 0;

const regex = isRegex ? new RegExp(query, 'i') : null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match = false;
    if (isRegex) {
        match = regex.test(line);
    } else {
        match = line.toLowerCase().includes(query.toLowerCase());
    }
    if (match) {
        console.log(`${i + 1}: ${line.trim()}`);
        count++;
        if (count >= 100) {
            console.log('... truncated after 100 results');
            break;
        }
    }
}
console.log(`Found ${count} matches.`);
