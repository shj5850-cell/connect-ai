const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const query = process.argv[3];

if (!filePath || !query) {
    console.error("Usage: node search_any_file.js <file_path> <query>");
    process.exit(1);
}

const target = path.resolve(filePath);
if (!fs.existsSync(target)) {
    console.error("File not found:", target);
    process.exit(1);
}

const content = fs.readFileSync(target, 'utf-8');
const lines = content.split('\n');

console.log(`Searching for "${query}" in ${path.basename(target)}...`);

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
