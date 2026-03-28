import fs from 'fs';
import path from 'path';

// CP1252 byte-to-unicode mapping for 0x80-0x9F range
const cp1252Map = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201C: 0x93, // "
  0x201D: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
};

function charToByte(ch) {
  const cp = ch.codePointAt(0);
  if (cp < 0x100) return cp;
  if (cp1252Map[cp] !== undefined) return cp1252Map[cp];
  return null;
}

function fixMojibake(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const b = charToByte(ch);

    if (b !== null && b >= 0xC0 && b <= 0xF7) {
      // Potential UTF-8 lead byte
      const seqLen = (b >= 0xF0) ? 4 : (b >= 0xE0) ? 3 : 2;
      const bytes = [b];
      let valid = true;

      for (let j = 1; j < seqLen && (i + j) < text.length; j++) {
        const nextB = charToByte(text[i + j]);
        if (nextB !== null && nextB >= 0x80 && nextB <= 0xBF) {
          bytes.push(nextB);
        } else {
          valid = false;
          break;
        }
      }

      if (valid && bytes.length === seqLen) {
        try {
          const decoded = Buffer.from(bytes).toString('utf-8');
          if (!decoded.includes('\uFFFD')) {
            result.push(decoded);
            i += seqLen;
            continue;
          }
        } catch (_e) { /* fall through */ }
      }
    }
    result.push(ch);
    i++;
  }
  return result.join('');
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      files.push(...walkDir(full));
    } else if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

const srcDir = path.join('apps', 'web', 'src');
const files = walkDir(srcDir);
let fixCount = 0;

for (const f of files) {
  const original = fs.readFileSync(f, 'utf-8');
  const fixed = fixMojibake(original);
  if (fixed !== original) {
    fs.writeFileSync(f, fixed, 'utf-8');
    fixCount++;
    console.log('Fixed:', path.relative('.', f));
  }
}
console.log('---');
console.log('Total files fixed:', fixCount);
