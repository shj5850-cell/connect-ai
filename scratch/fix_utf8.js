const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
if (!fs.existsSync(targetPath)) {
  console.error("File not found:", targetPath);
  process.exit(1);
}

const buffer = fs.readFileSync(targetPath);
console.log(`Buffer length: ${buffer.length} bytes`);

// Let's decode the buffer to see if there is any invalid UTF-8 sequence.
// In Node.js, TextDecoder with fatal: true will throw on invalid UTF-8.
try {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const text = decoder.decode(buffer);
  console.log("File is valid UTF-8! No invalid byte sequence found by TextDecoder.");
} catch (err) {
  console.error("TextDecoder failed:", err.message);
  
  // Let's locate the error offset.
  // We can decode slice by slice or character by character.
  // Let's do a simple binary search or chunked check to find the exact offset of the invalid sequence.
  let errorOffset = -1;
  const chunkDecoder = new TextDecoder('utf-8', { fatal: true });
  for (let i = 0; i < buffer.length; i++) {
    try {
      // Decode up to index i
      chunkDecoder.decode(buffer.slice(0, i));
    } catch (e) {
      errorOffset = i - 1;
      break;
    }
  }
  
  if (errorOffset !== -1) {
    console.log(`Found invalid UTF-8 start byte at index: ${errorOffset}`);
    console.log(`Bytes around index:`);
    const start = Math.max(0, errorOffset - 20);
    const end = Math.min(buffer.length, errorOffset + 20);
    const slice = buffer.slice(start, end);
    console.log(`Offset ${start} to ${end}:`, Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Let's see the characters around there decoded as ascii/utf8 lossy
    const lossyDecoder = new TextDecoder('utf-8', { fatal: false });
    console.log(`Lossy decoded text: "${lossyDecoder.decode(slice)}"`);
  }
  
  // Let's create a clean buffer by decoding lossily and writing back
  const cleanText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  fs.writeFileSync(targetPath, cleanText, 'utf-8');
  console.log("Successfully wrote clean UTF-8 string back to route.js!");
}
