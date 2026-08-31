import type { CaptureMode } from './demoAssets';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Guide box dimensions — aspect is always width/height */
export function getGuideBoxStyle(mode: CaptureMode): { widthPct: number; aspect: number } {
  if (mode === 'face') return { widthPct: 0.56, aspect: 0.75 };
  if (mode === 'pan') return { widthPct: 0.78, aspect: 1.586 };
  if (mode === 'sign') return { widthPct: 0.78, aspect: 1.586 };
  return { widthPct: 0.5, aspect: 1 };
}

/** Pixel guide rect centered in a container — single geometry source for overlay + crop */
export function getGuideBoxPxRect(containerW: number, containerH: number, mode: CaptureMode): PxRect {
  const { widthPct, aspect } = getGuideBoxStyle(mode);
  const width = containerW * widthPct;
  const height = width / aspect;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

/** Map container px rect to video crop coords (object-cover) */
export function pxRectToVideoCrop(
  rect: PxRect,
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
): CropRect {
  const scale = Math.max(containerW / videoW, containerH / videoH);
  const displayW = videoW * scale;
  const displayH = videoH * scale;
  const offsetX = (containerW - displayW) / 2;
  const offsetY = (containerH - displayH) / 2;
  return {
    x: Math.max(0, (rect.left - offsetX) / scale),
    y: Math.max(0, (rect.top - offsetY) / scale),
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

export function buildGuideMaskDataUri(
  containerW: number,
  containerH: number,
  rect: PxRect,
  shape: 'face' | 'rect',
): string {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;

  const hole =
    shape === 'face'
      ? `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${2 * rx},0 a ${rx},${ry} 0 1,0 ${-2 * rx},0`
      : roundedRectPath(rect, 12);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${containerW}" height="${containerH}">` +
    `<path fill-rule="evenodd" fill="white" d="M0,0 H${containerW} V${containerH} H0 Z ${hole}"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function roundedRectPath(r: PxRect, rad: number): string {
  const x = r.left;
  const y = r.top;
  const w = r.width;
  const h = r.height;
  const rr = Math.min(rad, w / 2, h / 2);
  return (
    `M ${x + rr},${y} H ${x + w - rr} A ${rr},${rr} 0 0 1 ${x + w},${y + rr} ` +
    `V ${y + h - rr} A ${rr},${rr} 0 0 1 ${x + w - rr},${y + h} ` +
    `H ${x + rr} A ${rr},${rr} 0 0 1 ${x},${y + h - rr} ` +
    `V ${y + rr} A ${rr},${rr} 0 0 1 ${x + rr},${y} Z`
  );
}

export function getNormalizedCrop(
  mode: 'face' | 'pan' | 'sign',
  vw: number,
  vh: number,
  containerW = vw,
  containerH = vh,
): CropRect {
  const pxRect = getGuideBoxPxRect(containerW, containerH, mode);
  return pxRectToVideoCrop(pxRect, containerW, containerH, vw, vh);
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  crop?: CropRect,
  quality = 0.9,
  flip = false,
): string | null {
  if (video.videoWidth === 0) return null;
  const canvas = document.createElement('canvas');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const rect = crop ?? { x: 0, y: 0, width: vw, height: vh };
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (flip) {
    ctx.translate(rect.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Crop PAN card photo region (left-center of card) */
export function cropPanPhotoFromCard(cardDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.width;
      const h = img.height;
      const cropW = w * 0.22;
      const cropH = h * 0.55;
      const cropX = w * 0.04;
      const cropY = h * 0.22;
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } else {
        resolve(cardDataUrl);
      }
    };
    img.onerror = () => resolve(cardDataUrl);
    img.src = cardDataUrl;
  });
}

export async function cropImageToGuide(
  src: string,
  mode: 'pan' | 'sign',
  containerW?: number,
  containerH?: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cw = containerW ?? img.width;
      const ch = containerH ?? img.height;
      const pxRect = getGuideBoxPxRect(cw, ch, mode);
      const crop = pxRectToVideoCrop(pxRect, cw, ch, img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } else resolve(src);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
