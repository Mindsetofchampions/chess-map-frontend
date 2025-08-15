import mapboxgl from 'mapbox-gl';
import { PERSONA_GIF, type PersonaKey } from '../assets/personas';

/**
 * Load image with proper error handling
 */
function loadImage(src: string, crossOrigin = 'anonymous'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = crossOrigin; // prevents canvas taint if served from CDN later
    img.decoding = 'sync';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Convert GIF to bitmap (first frame for Mapbox symbols)
 */
async function toBitmapFirstFrame(src: string, size = 36): Promise<ImageBitmap> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  
  // Ensure crisp pixel art rendering
  (ctx as any).imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  
  return await createImageBitmap(canvas);
}

/**
 * Register persona sprites in Mapbox map
 */
export async function registerPersonaSprites(map: mapboxgl.Map): Promise<void> {
  const tasks: Promise<void>[] = [];
  
  (Object.keys(PERSONA_GIF) as PersonaKey[]).forEach((key) => {
    const src = PERSONA_GIF[key];
    tasks.push((async () => {
      try {
        // Register normal size sprite (36px)
        const normal = await toBitmapFirstFrame(src, 36);
        if (!map.hasImage(`${key}-normal`)) {
          map.addImage(`${key}-normal`, normal, { pixelRatio: 1 });
        }
        
        // Register hover size sprite (46px)
        const hover = await toBitmapFirstFrame(src, 46);
        if (!map.hasImage(`${key}-hover`)) {
          map.addImage(`${key}-hover`, hover, { pixelRatio: 1 });
        }
      } catch (error) {
        console.error(`Failed to register sprite for ${key}:`, error);
        // Continue with other sprites even if one fails
      }
    })());
  });
  
  await Promise.all(tasks);
}

/**
 * Create persona marker for DOM-based animation
 */
export function createPersonaMarker(opts: {
  map: mapboxgl.Map;
  persona: PersonaKey;
  lngLat: mapboxgl.LngLatLike;
  size?: number;
  title?: string;
  draggable?: boolean;
}): mapboxgl.Marker {
  const { map, persona, lngLat, size = 48, title, draggable = false } = opts;
  const src = PERSONA_GIF[persona];
  
  // Create marker element
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.display = 'inline-block';
  el.style.cursor = 'pointer';
  
  // Create image element
  const img = document.createElement('img');
  img.src = src;
  img.alt = title ?? persona;
  img.width = size;
  img.height = size;
  img.style.imageRendering = 'pixelated'; // Crisp pixel art
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.borderRadius = '50%';
  img.style.border = '2px solid rgba(255, 255, 255, 0.8)';
  img.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  
  el.appendChild(img);
  
  if (title) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', title);
    el.title = title;
  }
  
  const marker = new mapboxgl.Marker({ element: el, draggable });
  return marker.setLngLat(lngLat).addTo(map);
}

/**
 * Get sprite ID for Mapbox symbol layers
 */
export function getSpriteId(persona: PersonaKey, hover = false): string {
  return `${persona}-${hover ? 'hover' : 'normal'}`;
}

/**
 * Clean up persona sprites from map
 */
function unloadPersonaSprites(map: mapboxgl.Map): void {
  (Object.keys(PERSONA_GIF) as PersonaKey[]).forEach((k) => {
    for (const id of [`${k}-normal`, `${k}-hover`]) {
      if (map.hasImage(id)) {
        map.removeImage(id);
      }
    }
  });
}