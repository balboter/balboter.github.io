// Pipeline pour améliorer les 27 photos d'installations via Stable Horde (anonyme, gratuit).
// Usage : node scripts/improve-photos-horde.mjs [--photo N] [--all]
//
// Stratégie : img2img denoising 0.30-0.40 avec modèle photoréaliste
// (AbsoluteReality / Deliberate). Préserve la composition, embellit lumière/texture/objets.
//
// Coût : 0 € (kudos anonymes). Latence : 1-10 min par image selon queue.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Buffer } from "node:buffer";
import sharp from "sharp";

const API = "https://stablehorde.net/api/v2";
const APIKEY = "0000000000";
const AGENT = "poelesgodin-refonte:1.0:contact@local";
const MODEL = "AbsoluteReality";

const photosDir = "public/images/installations";
const outDir = "public/images/installations-improved";
mkdirSync(outDir, { recursive: true });

// Map par photo : prompts ciblés selon le contenu identifié manuellement
const photoSpecs = {
  "137.webp": {
    prompt:
      "professional interior photography of a french modern living room, closed wood-burning fireplace with glass door, deep blue accent wall, beige fabric sofa, wooden coffee table, tropical leaf wallpaper, soft warm natural daylight, clean uncluttered tidy space, photorealistic, high quality",
    negative:
      "blurry, cardboard, boxes, packaging, clutter, low quality, watermark, text, oversaturated, fake, plastic",
    denoise: 0.30,
  },
  "200.webp": {
    prompt:
      "professional interior photography of a modern french home with pellet stove, geometric black wall panel decoration, sun clock, warm fire glowing in stove, soft natural daylight, tidy clean space, photorealistic, lifestyle",
    negative:
      "blurry, low quality, watermark, oversaturated, plastic, fake, washed out",
    denoise: 0.25,
  },
  "123.webp": {
    prompt:
      "professional interior photography of a black wood-burning stove against a grey wall, framed family photos, dried flowers on wooden table, warm cozy lighting, photorealistic, lifestyle interior",
    negative:
      "blurry, low quality, watermark, plastic, washed out, fake",
    denoise: 0.22,
  },
  // Default for the rest
  _default: {
    prompt:
      "professional interior photography of a french home with installed wood or pellet stove, warm natural lighting, tidy clean uncluttered space, photorealistic, lifestyle, high quality, sharp focus",
    negative:
      "blurry, cardboard, boxes, packaging, clutter, mess, low quality, watermark, text, oversaturated, plastic, fake",
    denoise: 0.25,
  },
};

async function submitJob(b64, spec) {
  const body = {
    prompt: `${spec.prompt} ### ${spec.negative}`,
    params: {
      sampler_name: "k_euler_a",
      cfg_scale: 5.0,
      denoising_strength: spec.denoise,
      height: 512,
      width: 512,
      karras: true,
      steps: 30,
      n: 1,
    },
    source_image: b64,
    source_processing: "img2img",
    models: [MODEL],
    r2: true,
    nsfw: false,
    censor_nsfw: false,
  };
  const res = await fetch(`${API}/generate/async`, {
    method: "POST",
    headers: {
      apikey: APIKEY,
      "Content-Type": "application/json",
      "Client-Agent": AGENT,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`submit failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.id;
}

async function waitJob(id, maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await fetch(`${API}/generate/check/${id}`);
    if (!res.ok) {
      console.error("  check failed:", res.status);
      await sleep(10_000);
      continue;
    }
    const j = await res.json();
    if (j.done) return;
    const wait = j.wait_time ?? j.queue_position ?? 30;
    console.log(`  queue=${j.queue_position ?? "?"} wait=${wait}s processing=${j.processing}`);
    await sleep(Math.min(15_000, Math.max(5_000, wait * 1000)));
  }
  throw new Error("timeout");
}

async function fetchResult(id) {
  const res = await fetch(`${API}/generate/status/${id}`);
  const j = await res.json();
  if (!j.generations || !j.generations.length) throw new Error("no generations");
  const url = j.generations[0].img;
  // r2:true => url directe
  if (url.startsWith("http")) {
    const imgRes = await fetch(url);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  // Fallback base64
  return Buffer.from(url, "base64");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function processPhoto(filename) {
  const src = `${photosDir}/${filename}`;
  const out = `${outDir}/${filename.replace(".webp", ".jpg")}`;
  const spec = photoSpecs[filename] ?? photoSpecs._default;

  console.log(`\n📸 ${filename}`);
  console.log(`  denoising=${spec.denoise}`);

  // Convertir WebP → JPEG redimensionné 512x512 (Stable Horde limite gratuite)
  const jpegBuf = await sharp(src).resize(512, 512, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
  const b64 = jpegBuf.toString("base64");

  console.log("  → submit Stable Horde...");
  const id = await submitJob(b64, spec);
  console.log(`  ID=${id}`);

  console.log("  → wait...");
  await waitJob(id);

  console.log("  → fetch result");
  const buf = await fetchResult(id);
  writeFileSync(out, buf);
  console.log(`  ✓ saved ${out} (${buf.length} bytes)`);

  // Re-encoder en WebP haute qualité pour le site
  const webpOut = out.replace(".jpg", ".webp");
  await sharp(buf).webp({ quality: 88 }).toFile(webpOut);
  console.log(`  ✓ webp ${webpOut}`);
}

const args = process.argv.slice(2);
let target = null;
let all = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--photo") target = args[++i];
  else if (args[i] === "--all") all = true;
}

const photos = ["137.webp"]; // default test single

if (target) {
  await processPhoto(target);
} else if (all) {
  const fs = await import("node:fs");
  const files = fs.readdirSync(photosDir).filter((f) => f.endsWith(".webp"));
  for (const f of files) {
    try {
      await processPhoto(f);
    } catch (e) {
      console.error(`  ✗ ${f}:`, e.message);
    }
    await sleep(2000);
  }
} else {
  for (const f of photos) await processPhoto(f);
}

console.log("\nDone.");
