import fs from 'fs';
import path from 'path';

// One-off generator for the homepage hero illustrations, via the Maxora
// internal image API (see API-USAGE.md in Old_Content_Farm for the contract).
// Not part of the daily cron chain — run manually when art needs regenerating.

const CF_ID = process.env.MAXORA_CF_ID;
const CF_SECRET = process.env.MAXORA_CF_SECRET;

if (!CF_ID || !CF_SECRET) {
  console.error("❌ Error: MAXORA_CF_ID or MAXORA_CF_SECRET is not set.");
  process.exit(1);
}

const BASE = 'https://image.aidsagent.net';
const outDir = path.resolve('public/images/hero');
fs.mkdirSync(outDir, { recursive: true });

const STYLE_SUFFIX = ", minimalist flat vector illustration, dynamic action silhouette, dark emerald green background (#0c1a13), warm gold (#f59e0b) rim light accents, subtle violet (#a78bfa) highlight accents, clean bold shapes, no text, no letters, no logos, no watermark, high contrast, premium sports betting website hero art";

const IMAGES = [
  {
    name: 'cricket',
    prompt: "A cricket batsman mid-swing striking the ball, dramatic low-angle action pose" + STYLE_SUFFIX,
  },
  {
    name: 'football',
    prompt: "A footballer striking a ball mid-air with full follow-through, dramatic dynamic pose" + STYLE_SUFFIX,
  },
];

async function generate(prompt, user) {
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'CF-Access-Client-Id': CF_ID,
      'CF-Access-Client-Secret': CF_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      size: '1:1',
      user,
      cfg: 2.5,
      negative_prompt: 'text, letters, words, logo, watermark, icon badge, signature, caption, speech bubble',
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data in response');
  return Buffer.from(b64, 'base64');
}

async function main() {
  const only = process.argv[2]; // optional: generate just one by name for a quick test
  const targets = only ? IMAGES.filter(i => i.name === only) : IMAGES;
  if (targets.length === 0) {
    console.error(`No matching image config for "${only}". Available: ${IMAGES.map(i => i.name).join(', ')}`);
    process.exit(1);
  }

  for (const img of targets) {
    console.log(`🎨 Generating "${img.name}"...`);
    try {
      const buf = await generate(img.prompt, 'the-big-bet');
      const outPath = path.join(outDir, `${img.name}.webp`);
      fs.writeFileSync(outPath, buf);
      console.log(`✅ Saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`⚠️ Failed to generate "${img.name}":`, e.message);
    }
  }
}

main();
