/**
 * Persona GIF Assets
 * 
 * Imports persona GIF files for use in quest bubbles and map markers.
 * Uses existing sprites from public directory until dedicated assets are added.
 */

// For now, reference the existing public sprite files
// In production, these would be imported GIF files in this directory
export const PERSONA_GIF = {
  hootie: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
  kittykat: '/sprites/cat.gif/KITTY_BOUNCE.gif',
  gino: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
  hammer: '/sprites/robot.gif/HAMMER_SWING.gif',
  badge: '/sprites/badge.gif/BADGE_SHINE.gif'
} as const;

export type PersonaKey = keyof typeof PERSONA_GIF;

/**
 * Get persona display information
 */
export const getPersonaInfo = (key: PersonaKey) => {
  const personaMap = {
    hootie: { name: 'Hootie the Owl', emoji: '🦉', category: 'Character' },
    kittykat: { name: 'Kitty Kat', emoji: '🐱', category: 'Health' },
    gino: { name: 'Gino the Dog', emoji: '🐕', category: 'Exploration' },
    hammer: { name: 'Hammer the Robot', emoji: '🤖', category: 'STEM' },
    badge: { name: 'MOC Badge', emoji: '🏛️', category: 'Stewardship' }
  };
  
  return personaMap[key] || { name: key, emoji: '❓', category: 'Unknown' };
};