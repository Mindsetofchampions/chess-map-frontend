/**
 * Mapbox Sprite Management for CHESS Personas
 * 
 * Handles SVG to ImageBitmap conversion and sprite registration
 * for all CHESS persona characters with hover effects.
 */

import mapboxgl from 'mapbox-gl';

/**
 * Persona type definition
 */
export type PersonaType = 'hootie' | 'kittykat' | 'gino' | 'hammer' | 'badge';

/**
 * SVG icon definitions for each persona
 */
const PERSONA_SVGS: Record<PersonaType, string> = {
  hootie: `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#8B5CF6" stroke="white" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">🦉</text>
    </svg>
  `,
  kittykat: `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#10B981" stroke="white" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">🐱</text>
    </svg>
  `,
  gino: `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#F59E0B" stroke="white" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">🐕</text>
    </svg>
  `,
  hammer: `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#3B82F6" stroke="white" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">🤖</text>
    </svg>
  `,
  badge: `
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#EF4444" stroke="white" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">🏛️</text>
    </svg>
  `
};

/**
 * Convert SVG string to ImageBitmap for Mapbox
 */
export const svgToImageBitmap = async (svgString: string, size: number = 36): Promise<ImageBitmap> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        
        createImageBitmap(blob).then(resolve).catch(reject);
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };
    
    img.src = url;
  });
};

/**
 * Load all persona sprites into Mapbox map
 */
export const loadPersonaSprites = async (map: mapboxgl.Map): Promise<void> => {
  const loadPromises: Promise<void>[] = [];
  
  for (const [persona, svg] of Object.entries(PERSONA_SVGS)) {
    // Load normal size sprite (36px)
    loadPromises.push(
      svgToImageBitmap(svg, 36).then(bitmap => {
        if (!map.hasImage(`${persona}-normal`)) {
          map.addImage(`${persona}-normal`, bitmap);
        }
      })
    );
    
    // Load hover size sprite (46px)
    loadPromises.push(
      svgToImageBitmap(svg, 46).then(bitmap => {
        if (!map.hasImage(`${persona}-hover`)) {
          map.addImage(`${persona}-hover`, bitmap);
        }
      })
    );
  }
  
  await Promise.all(loadPromises);
};

/**
 * Get sprite ID for a persona
 */
export const getSpriteId = (persona: PersonaType, isHover: boolean = false): string => {
  return `${persona}-${isHover ? 'hover' : 'normal'}`;
};