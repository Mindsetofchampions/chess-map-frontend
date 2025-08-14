// CHESS Persona Asset URLs (bundled by Vite)
// Maps persona keys to their respective GIF assets from public directory

// Import actual GIF files from public/sprites directory
const hootie = '/sprites/owl.gif/HOOTIE_WINGLIFT.gif';
const kittykat = '/sprites/cat.gif/KITTY_BOUNCE.gif';
const gino = '/sprites/dog.gif/GINO_COMPASSSPIN.gif';
const hammer = '/sprites/robot.gif/HAMMER_SWING.gif';
const badge = '/sprites/badge.gif/BADGE_SHINE.gif';

export const PERSONA_GIF = {
  hootie,
  kittykat, 
  gino,
  hammer,
  badge
} as const;

export type PersonaKey = keyof typeof PERSONA_GIF;

// Validation helper to check if persona key exists
export function isValidPersonaKey(key: string): key is PersonaKey {
  return key in PERSONA_GIF;
}

// Get persona asset URL with fallback
export function getPersonaAsset(key: PersonaKey): string {
  return PERSONA_GIF[key];
}

// Export for backward compatibility
export { hootie, kittykat, gino, hammer, badge };