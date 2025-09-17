// src/utils/imageCompression.js

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

function drawToCanvas(img, maxWidth, maxHeight) {
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  const ratio = Math.min(1, maxWidth / width || 1, maxHeight / height || 1);
  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

async function canvasToBlobWithTargetSize(canvas, mimeType, quality, maxBytes, minQuality = 0.3) {
  async function toBlob(q) {
    return await new Promise((resolve) => canvas.toBlob(resolve, mimeType, q));
  }
  let q = quality;
  let blob = await toBlob(q);
  if (!blob) throw new Error('Compression failed');
  while (maxBytes && blob.size > maxBytes && q > minQuality) {
    q = Math.max(minQuality, q - 0.1);
    const next = await toBlob(q);
    if (!next) break;
    blob = next;
    if (q <= minQuality) break;
  }
  return blob;
}

export async function compressImage(file, {
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8,
  mimeType = 'image/jpeg',
  maxBytes = 0, // 0 = no cap
  asFile = true,
  outName,
} = {}) {
  const image = await loadImageFromFile(file);
  const canvas = drawToCanvas(image, maxWidth, maxHeight);
  const blob = await canvasToBlobWithTargetSize(canvas, mimeType, quality, maxBytes);
  if (asFile) {
    const name = outName || (file.name ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : 'image.jpg');
    return new File([blob], name, { type: mimeType, lastModified: Date.now() });
  }
  return await new Promise((resolve) => {
    resolve(canvas.toDataURL(mimeType, Math.min(quality, 0.92)));
  });
}

export async function compressForAvatar(file) {
  return compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.8,
    mimeType: 'image/jpeg',
    maxBytes: 200 * 1024,
    asFile: true,
    outName: (file.name ? file.name.replace(/\.[^.]+$/, '') : 'avatar') + '.jpg',
  });
}

export async function compressForCover(file) {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.82,
    mimeType: 'image/jpeg',
    maxBytes: 600 * 1024,
    asFile: true,
    outName: (file.name ? file.name.replace(/\.[^.]+$/, '') : 'cover') + '.jpg',
  });
}

