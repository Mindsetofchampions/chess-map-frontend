/**
 * Persona GIF Assets
 * 
 * Imports persona GIF files for use in quest bubbles and map markers.
 * Uses actual GIF assets from the public sprites directory.
 */

// Reference the actual GIF files from public directory
const hootieGif = '/sprites/owl.gif/HOOTIE_WINGLIFT.gif';
const kittykatGif = '/sprites/cat.gif/KITTYKAT_IDLE.gif';
const ginoGif = '/sprites/dog.gif/GINO_IDLE.gif';
const hammerGif = '/sprites/robot.gif/HAMMER_IDLE.gif';
const badgeGif = '/sprites/badge.gif/BADGE_IDLE.gif';

export const PERSONA_GIF = {
  hootie: hootieGif,
  kittykat: kittykatGif,
  gino: ginoGif,
  hammer: hammerGif,
  badge: badgeGif
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