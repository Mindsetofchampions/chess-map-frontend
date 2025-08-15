/**
 * Sprite Management for Mapbox Integration
 * 
 * Handles loading persona GIFs into Mapbox as symbols and creating
 * DOM-based animated markers for quest bubbles.
 */

import mapboxgl from 'mapbox-gl';
import { PERSONA_GIF, type PersonaKey } from '../assets/personas';

/**
 * Load image with error handling
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Convert GIF first frame to ImageBitmap for Mapbox symbols
 */
async function gifToImageBitmap(src: string, size: number = 36): Promise<ImageBitmap> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  
  // Crisp pixel art rendering
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  
  return await createImageBitmap(canvas);
}

/**
 * Register persona sprites in Mapbox map for use in symbol layers
 * Creates both normal and hover variants for each persona
 */
export async function registerPersonaSprites(map: mapboxgl.Map): Promise<void> {
  const registrationTasks: Promise<void>[] = [];
  
  (Object.keys(PERSONA_GIF) as PersonaKey[]).forEach((key) => {
    registrationTasks.push((async () => {
      try {
        const src = PERSONA_GIF[key];
        
        // Register normal size (36px)
        const normal = await gifToImageBitmap(src, 36);
        if (!map.hasImage(`${key}-normal`)) {
          map.addImage(`${key}-normal`, normal, { pixelRatio: 1 });
        }
        
        // Register hover size (46px)
        const hover = await gifToImageBitmap(src, 46);
        if (!map.hasImage(`${key}-hover`)) {
          map.addImage(`${key}-hover`, hover, { pixelRatio: 1 });
        }
        
        console.log(`✅ Registered sprites for ${key}`);
      } catch (error) {
        console.error(`❌ Failed to register sprite for ${key}:`, error);
      }
    })());
  });
  
  await Promise.all(registrationTasks);
}

/**
 * Create animated DOM-based persona marker for quest bubbles
 * Uses actual GIF animation instead of static Mapbox symbols
 */
export function createPersonaMarker(options: {
  map: mapboxgl.Map;
  persona: PersonaKey;
  lngLat: [number, number];
  title?: string;
  onClick?: () => void;
  size?: number;
}): mapboxgl.Marker {
  const { map, persona, lngLat, title, onClick, size = 48 } = options;
  
  // Create marker element
  const element = document.createElement('div');
  element.className = 'persona-quest-marker';
  element.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    cursor: pointer;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    background: rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Add animated GIF
  const img = document.createElement('img');
  img.src = PERSONA_GIF[persona];
  img.alt = title || persona;
  img.style.cssText = `
    width: ${size - 6}px;
    height: ${size - 6}px;
    object-fit: cover;
    border-radius: 50%;
    pointer-events: none;
  `;
  
  element.appendChild(img);
  
  // Add hover effects
  element.addEventListener('mouseenter', () => {
    element.style.transform = 'scale(1.2)';
    element.style.zIndex = '1000';
    element.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
    element.style.zIndex = 'auto';
    element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  });
  
  // Add click handler
  if (onClick) {
    element.addEventListener('click', onClick);
  }
  
  // Add accessibility
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', '0');
  element.setAttribute('aria-label', title || `${persona} quest`);
  
  if (title) {
    element.title = title;
  }
  
  // Create and return Mapbox marker
  const marker = new mapboxgl.Marker(element)
    .setLngLat(lngLat)
    .addTo(map);
  
  return marker;
}

/**
 * Get sprite ID for Mapbox symbol layers
 */
export function getSpriteId(persona: PersonaKey, hover: boolean = false): string {
  return `${persona}-${hover ? 'hover' : 'normal'}`;
}