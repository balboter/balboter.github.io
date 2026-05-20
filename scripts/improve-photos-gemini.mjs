// Pipeline pour améliorer les photos d'installations via Gemini 2.5 Flash Image (nano-banana).
// Free tier : 500 requêtes/jour gratuites via Google AI Studio.
//
// Usage :
//   1. Crée une clé sur https://aistudio.google.com/app/apikey
//   2. export GEMINI_API_KEY=AIza...
//   3. node scripts/improve-photos-gemini.mjs --photo 137.webp
//   ou : node scripts/improve-photos-gemini.mjs --all
//
// Stratégie : édition contextuelle en langage naturel via le modèle gemini-2.5-flash-image.
// Préserve la composition, modifie le contenu ciblé (enlever objets, ajouter feu, etc.)

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { Buffer } from "node:buffer";
import sharp from "sharp";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY manquante. Crée une clé sur https://aistudio.google.com/app/apikey puis :");
  console.error("   export GEMINI_API_KEY=AIza...");
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-image-preview";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const photosDir = "public/images/installations";
const outDir = "public/images/installations-improved";
mkdirSync(outDir, { recursive: true });

// Instructions par photo (mode language naturel — Gemini comprend le contexte)
const photoInstructions = {
  "137.webp":
    "Edit this interior photo of a living room with a fireplace. Important : keep everything identical EXCEPT remove the cardboard box visible in the bottom-left corner — make it look like a clean tidy floor instead. Also add a subtle warm fire glow visible through the fireplace glass door. Keep all furniture, colors, walls, and the tropical wallpaper exactly as they are. Result must look like a natural unedited photo, no AI artifacts.",
  "200.webp":
    "Edit this interior photo of a pellet stove in a living room with black wall decoration and a sun clock. Make the small fire visible inside the stove more pronounced and warmer (orange/yellow glow). Slightly warm up the overall lighting to feel more inviting. Keep absolutely everything else identical : the stove, the wall panel, the clock, the butterflies, the floor. Photo realistic, no AI look.",
  "123.webp":
    "Edit this interior photo of a vertical black wood-burning stove against a grey wall. Add a subtle warm fire glow visible through the stove door (orange/red). Slightly enrich the warm tones of the wood table and the dried flowers in the foreground for a cozier ambiance. Keep everything else identical : the stove, wall, family photos, decoration. Photo realistic.",
  // Pour les autres photos : prompt générique d'amélioration douce
  _default:
    "Lightly enhance this interior photo to look more professional : slightly improve lighting warmth, sharpen details a bit, make any visible fire inside the stove more vivid and natural. Do NOT change the composition, furniture placement, or any major element. The photo must look like a natural unedited shot, no AI artifacts, no oversaturation, no plastic look. Keep all original colors and materials.",
};

async function editImage(filename) {
  const src = `${photosDir}/${filename}`;
  const out = `${outDir}/${filename}`;

  // Resize si besoin (Gemini accepte jusqu'à 2048 dim, on garde original)
  const jpegBuf = await sharp(src).jpeg({ quality: 95 }).toBuffer();
  const b64 = jpegBuf.toString("base64");

  const instruction = photoInstructions[filename] ?? photoInstructions._default;

  console.log(`\n📸 ${filename}`);
  console.log(`   prompt: ${instruction.slice(0, 80)}...`);

  const body = {
    contents: [
      {
        parts: [
          { text: instruction },
          { inline_data: { mime_type: "image/jpeg", data: b64 } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      temperature: 0.4,
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();

  // Trouver la partie image dans la réponse
  const candidates = json.candidates ?? [];
  let imageData = null;
  for (const c of candidates) {
    for (const part of c.content?.parts ?? []) {
      if (part.inline_data?.data) {
        imageData = part.inline_data.data;
        break;
      }
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
    if (imageData) break;
  }

  if (!imageData) {
    console.error("   ✗ no image returned, raw response:", JSON.stringify(json).slice(0, 500));
    throw new Error("no image data in response");
  }

  const outBuf = Buffer.from(imageData, "base64");
  writeFileSync(out.replace(".webp", ".png"), outBuf);

  // Convertir en WebP optimisé pour le site
  await sharp(outBuf).webp({ quality: 88 }).toFile(out);
  console.log(`   ✓ saved ${out} (${(outBuf.length / 1024).toFixed(1)} KB → WebP)`);
}

const args = process.argv.slice(2);
let target = null;
let all = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--photo") target = args[++i];
  else if (args[i] === "--all") all = true;
}

if (target) {
  await editImage(target);
} else if (all) {
  const files = readdirSync(photosDir).filter((f) => f.endsWith(".webp"));
  console.log(`Processing ${files.length} photos...`);
  let success = 0;
  let failed = 0;
  for (const f of files) {
    try {
      await editImage(f);
      success++;
    } catch (e) {
      console.error(`   ✗ ${f}:`, e.message.slice(0, 200));
      failed++;
    }
    await new Promise((r) => setTimeout(r, 1500)); // espace les requêtes
  }
  console.log(`\nDone. ${success} ok, ${failed} échec.`);
} else {
  console.log("Usage: node scripts/improve-photos-gemini.mjs --photo <name.webp>");
  console.log("       node scripts/improve-photos-gemini.mjs --all");
}
