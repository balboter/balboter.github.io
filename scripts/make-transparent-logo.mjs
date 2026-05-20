import sharp from "sharp";
import { writeFileSync } from "node:fs";

const input = "./public/images/branding/godin-exclusif.jpg";
const outDir = "./public/images/branding";

console.log("Lecture du logo source...");
const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

console.log(`Image: ${info.width}x${info.height}, ${info.channels} canaux`);

// Pixel par pixel : si pixel sombre → transparent ; transition douce
const out = Buffer.from(data);
for (let i = 0; i < out.length; i += info.channels) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  // Luminance perçue (BT.709)
  const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;

  if (lum < 25) {
    out[i + 3] = 0;
  } else if (lum < 60) {
    // Transition douce pour éviter le halo
    out[i + 3] = Math.round(((lum - 25) / 35) * 255);
  }
  // Sinon alpha reste 255 (opaque)
}

const rawOptions = {
  raw: { width: info.width, height: info.height, channels: info.channels },
};

console.log("Génération godin-exclusif.png (full size)...");
await sharp(out, rawOptions).png({ compressionLevel: 9 }).toFile(`${outDir}/godin-exclusif.png`);

console.log("Génération godin-exclusif-sm.png (header 480px)...");
await sharp(out, rawOptions).resize(480).png({ compressionLevel: 9 }).toFile(`${outDir}/godin-exclusif-sm.png`);

console.log("Génération favicon-512.png (rotated to bleed flame)...");
// Crop sur la moitié droite (qui contient surtout la flamme + le mot)
const halfWidth = Math.floor(info.width * 0.55);
const cropStartX = Math.floor(info.width * 0.3);
await sharp(out, rawOptions)
  .extract({ left: cropStartX, top: 0, width: halfWidth, height: info.height })
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile("./public/favicon-512.png");

console.log("Génération favicon-32.png...");
await sharp(out, rawOptions)
  .extract({ left: cropStartX, top: 0, width: halfWidth, height: info.height })
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile("./public/favicon.png");

console.log("Tous les logos générés !");
