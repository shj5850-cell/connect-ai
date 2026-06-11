function cleanCandidateString(str) {
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r')) {
      result += '\\n';
      continue;
    }
    result += char;
  }
  
  let cleaned = result.trim();
  cleaned = cleaned.replace(/(^|[^\:])\/\/.*$/gm, '$1');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
}

function cleanJson(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('cleanJson expected a string');
  }

  let text = input
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const starts = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') starts.push(i);
  }

  for (const start of starts) {
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === '{' || ch === '[') {
        stack.push(ch);
      }

      if (ch === '}' || ch === ']') {
        const last = stack[stack.length - 1];
        if (
          (last === '{' && ch === '}') ||
          (last === '[' && ch === ']')
        ) {
          stack.pop();
        } else {
          break;
        }

        if (stack.length === 0) {
          const candidate = text.slice(start, i + 1);
          const cleanedCandidate = cleanCandidateString(candidate);
          try {
            JSON.parse(cleanedCandidate);
            return cleanedCandidate;
          } catch (err) {
            break;
          }
        }
      }
    }
  }

  throw new Error('No valid JSON object or array found in model response');
}

// Test cases
const testCases = [
  {
    name: "JSON only",
    input: '{"key": "value"}',
    expected: {"key": "value"}
  },
  {
    name: "JSON inside markdown",
    input: '```json\n{\n  "scores": {\n    "hookStrength": 80,\n    "scriptContent": 85\n  }\n}\n```',
    expected: { scores: { hookStrength: 80, scriptContent: 85 } }
  },
  {
    name: "JSON followed by explanation",
    input: '{"status": "ok"}\nHere is some trailing text explaining the status: all targets met.',
    expected: {"status": "ok"}
  },
  {
    name: "JSON with nested arrays/objects",
    input: '{\n  "list": [1, 2, {"nested": [3, 4]}],\n  "empty": {}\n}',
    expected: { list: [1, 2, { nested: [3, 4] }], empty: {} }
  },
  {
    name: "JSON with braces inside strings",
    input: '{\n  "msg": "Hello {world} and [all] } } }"\n}',
    expected: { msg: "Hello {world} and [all] } } }" }
  },
  {
    name: "Multiple JSON blocks (should parse first valid block)",
    input: 'Some intro text...\n{"first": 1}\nSome middle text...\n{"second": 2}',
    expected: {"first": 1}
  }
];

let allPassed = true;
for (const tc of testCases) {
  console.log(`Running test: "${tc.name}"`);
  try {
    const cleanedStr = cleanJson(tc.input);
    const parsed = JSON.parse(cleanedStr);
    const expectedStr = JSON.stringify(tc.expected);
    const actualStr = JSON.stringify(parsed);
    
    if (expectedStr === actualStr) {
      console.log(`✅ Success!`);
    } else {
      console.error(`❌ Failed: Expected ${expectedStr}, got ${actualStr}`);
      allPassed = false;
    }
  } catch (e) {
    console.error(`❌ Error during execution:`, e.message);
    allPassed = false;
  }
  console.log('-------------------------------------------');
}

if (allPassed) {
  console.log("🎉 ALL TEST CASES PASSED SUCCESSFULLY!");
} else {
  console.error("⚠️ SOME TEST CASES FAILED.");
  process.exit(1);
}
