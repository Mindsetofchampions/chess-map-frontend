/**
 * Persona GIF Assets
 * 
 * Imports persona GIF files for use in quest bubbles and map markers.
 * Uses actual GIF assets from the personas directory.
 */

// Import the actual GIF files
import hootieGif from './hootie.gif';
import kittykitGif from './kittykat.gif';
import ginoGif from './gino.gif';
import hammerGif from './hammer.gif';
import badgeGif from './badge.gif';

export const PERSONA_GIF = {
  hootie: hootieGif,
  kittykat: kittykitGif,
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