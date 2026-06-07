function cleanJson(str) {
  if (!str) return '{}';
  
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    const firstBracket = str.indexOf('[');
    const lastBracket = str.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      str = str.substring(firstBracket, lastBracket + 1);
    }
  } else {
    str = str.substring(firstBrace, lastBrace + 1);
  }

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

const badJson = `
Some leading text here...
{
  "scores": {
    "hookStrength": 80, // inline comment
    "scriptContent": 85,
  },
  "evaluations": {
    "hookStrength": "This has a raw
newline inside quotes",
    "scriptContent": "This has a trailing comma,",
  }
}
And some trailing text here...
`;

console.log('Original JSON string:');
console.log(badJson);

try {
  const cleaned = cleanJson(badJson);
  console.log('Cleaned JSON string:');
  console.log(cleaned);
  
  const parsed = JSON.parse(cleaned);
  console.log('Parsed successfully:', parsed);
} catch (e) {
  console.error('Failed to parse:', e.message);
}
