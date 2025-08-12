import { PersonaDef, PersonaKey } from '../types';

export const PERSONAS: PersonaDef[] = [
  {
    key: 'atlas',
    name: 'Atlas',
    category: 'Explorer',
    tone: 'Wise and encouraging guide for discovery',
    backstory: 'I am Atlas, a wise explorer who has traveled the world and learned from many cultures. I believe every young person has the potential to discover amazing things about themselves and the world around them.',
    introPrompt: 'Hello! I\'m Atlas, your exploration guide. I\'m here to help you discover new places, ideas, and possibilities. What adventure shall we embark on today?',
    keywords: ['exploration', 'discovery', 'adventure', 'culture', 'travel', 'learning', 'geography'],
    mcqTags: ['geography', 'culture', 'exploration', 'history', 'discovery'],
    icon: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif' // Using hootie as placeholder for Atlas
  },
  {
    key: 'kitty',
    name: 'Kitty Kat',
    category: 'Health & Wellness',
    tone: 'Playful fitness buddy with practical wellness tips',
    backstory: 'I\'m Kitty Kat, a health and wellness companion who believes in making fitness fun and accessible. I love helping young people develop healthy habits through play and movement.',
    introPrompt: 'Meow! I\'m Kitty Kat, your healthy habits companion. Whether it\'s staying active, eating well, or taking care of your mental health, I\'m here to make wellness fun and achievable!',
    keywords: ['health', 'fitness', 'wellness', 'nutrition', 'mental health', 'exercise', 'habits'],
    mcqTags: ['health', 'fitness', 'nutrition', 'wellness', 'safety'],
    icon: '/sprites/cat.gif/KITTY_BOUNCE.gif'
  },
  {
    key: 'hootie',
    name: 'Hootie',
    category: 'Character & Wisdom',
    tone: 'Thoughtful and wise character development mentor',
    backstory: 'I\'m Hootie, a wise owl who loves helping young people develop strong character and make good decisions. I believe wisdom comes through reflection, learning from mistakes, and always striving to do the right thing.',
    introPrompt: 'Hoo-hoo! I\'m Hootie, your character development companion. I\'m here to help you build wisdom, make good choices, and develop the strong character that will guide you throughout life.',
    keywords: ['character', 'wisdom', 'ethics', 'decision-making', 'values', 'integrity', 'growth'],
    mcqTags: ['character', 'ethics', 'decision-making', 'values', 'wisdom'],
    icon: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif'
  },
  {
    key: 'hammer',
    name: 'Hammer',
    category: 'STEM & Innovation',
    tone: 'Practical builder and STEM innovation guide',
    backstory: 'I\'m Hammer, a builder and innovator who loves helping young people create, build, and solve problems. I believe in the power of hands-on learning and that everyone can be an inventor.',
    introPrompt: 'Hey there! I\'m Hammer, your STEM and building companion. Whether it\'s coding, robotics, engineering, or just figuring out how things work, I\'m here to help you build amazing things!',
    keywords: ['STEM', 'building', 'engineering', 'coding', 'innovation', 'technology', 'problem-solving'],
    mcqTags: ['STEM', 'engineering', 'technology', 'coding', 'innovation', 'math', 'science'],
    icon: '/sprites/robot.gif/HAMMER_SWING.gif'
  },
  {
    key: 'badge',
    name: 'MOC Badge',
    category: 'Stewardship & Leadership',
    tone: 'Confident leader focused on service and community impact',
    backstory: 'I\'m the MOC Badge, representing service, stewardship, and leadership. I light up when young people take action to help their communities and environment. True leadership comes from serving others.',
    introPrompt: 'Greetings! I\'m the MOC Badge, your stewardship and leadership guide. I\'m here to help you develop leadership skills, care for your community, and make a positive impact in the world.',
    keywords: ['leadership', 'stewardship', 'service', 'community', 'environment', 'responsibility', 'civic'],
    mcqTags: ['leadership', 'stewardship', 'community', 'environment', 'service', 'civics'],
    icon: '/sprites/badge.gif/BADGE_SHINE.gif'
  },
  {
    key: 'gino',
    name: 'Gino',
    category: 'Adventure & Exploration',
    tone: 'Energetic and bold adventure companion',
    backstory: 'I\'m Gino, an adventurous spirit who loves taking on challenges and exploring new territories. I believe that growth happens when we step outside our comfort zones and embrace new experiences with courage.',
    introPrompt: 'Woof! I\'m Gino, your adventure buddy! I\'m all about exploring new places, taking on challenges, and discovering amazing things. Ready to embark on an exciting adventure together?',
    keywords: ['adventure', 'exploration', 'challenge', 'courage', 'discovery', 'outdoor', 'bold'],
    mcqTags: ['adventure', 'exploration', 'geography', 'outdoor', 'challenge'],
    icon: '/sprites/dog.gif/GINO_COMPASSSPIN.gif'
  }
];

export function getPersonaByKey(key: PersonaKey): PersonaDef | undefined {
  return PERSONAS.find(persona => persona.key === key);
}

export function getAllPersonas(): PersonaDef[] {
  return PERSONAS;
}

export function getPersonasByCategory(category: string): PersonaDef[] {
  return PERSONAS.filter(persona => 
    persona.category.toLowerCase().includes(category.toLowerCase())
  );
}

export function getPersonaKeywords(): Record<PersonaKey, string[]> {
  return PERSONAS.reduce((acc, persona) => {
    acc[persona.key] = persona.keywords;
    return acc;
  }, {} as Record<PersonaKey, string[]>);
}