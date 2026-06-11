const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'extension.ts');
const content = fs.readFileSync(target, 'utf-8');
const lines = content.split('\n');

const query = process.argv[2] || 'axios';
console.log(`Searching for "${query}" in extension.ts...`);

let count = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(query.toLowerCase())) {
        console.log(`${i + 1}: ${lines[i].trim()}`);
        count++;
        if (count > 50) {
            console.log('... truncated after 50 matches');
            break;
        }
    }
}
