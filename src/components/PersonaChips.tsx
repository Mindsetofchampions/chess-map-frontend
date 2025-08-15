import { Map, Marker, Popup } from 'mapbox-gl';
import { PersonaDef, PersonaKey } from '../types';
import { getPersonaByKey } from '../data/personas';

/**
 * Custom HTML marker for persona chips on Mapbox
 */
export class PersonaChipMarker {
  private marker: Marker;
  private element: HTMLDivElement;
  private popup: Popup | null = null;

  constructor(
    persona: PersonaDef, 
    position: { lat: number; lng: number }, 
    onClick?: (persona: PersonaDef) => void
  ) {
    // Create HTML element for the marker
    this.element = document.createElement('div');
    this.element.className = 'persona-chip-marker';
    
    // Apply styles
    this.element.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      background-size: cover;
      background-position: center;
      background-image: url(${persona.icon});
      background-color: #1F1F2E;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    `;

    // Add hover effects
    this.element.addEventListener('mouseenter', () => {
      this.element.style.transform = 'scale(1.2)';
      this.element.style.zIndex = '1000';
      this.element.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
    });

    this.element.addEventListener('mouseleave', () => {
      this.element.style.transform = 'scale(1)';
      this.element.style.zIndex = 'auto';
      this.element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });

    // Add click handler
    if (onClick) {
      this.element.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(persona);
      });
    }

    // Add popup on hover
    this.element.addEventListener('mouseenter', () => {
      if (!this.popup) {
        this.createPopup(persona);
      }
    });

    // Add accessibility
    this.element.setAttribute('role', 'button');
    this.element.setAttribute('tabindex', '0');
    this.element.setAttribute('aria-label', `${persona.name} - ${persona.category} persona`);
    this.element.title = `${persona.name} - ${persona.category}`;

    // Create Mapbox marker
    this.marker = new Marker(this.element)
      .setLngLat([position.lng, position.lat]);
  }

  /**
   * Create popup with persona information
   */
  private createPopup(persona: PersonaDef): void {
    const popupContent = `
      <div class="persona-popup bg-glass backdrop-blur-lg border border-glass rounded-lg p-3 min-w-[200px]">
        <div class="flex items-center gap-3 mb-2">
          <img src="${persona.icon}" alt="${persona.name}" class="w-8 h-8 rounded-full object-cover">
          <div>
            <h3 class="text-white font-bold text-sm">${persona.name}</h3>
            <p class="text-gray-300 text-xs">${persona.category}</p>
          </div>
        </div>
        <p class="text-gray-200 text-xs leading-relaxed mb-3">${persona.introPrompt}</p>
        <div class="flex flex-wrap gap-1">
          ${persona.keywords.slice(0, 3).map(keyword => 
            `<span class="px-2 py-1 bg-glass-dark rounded-full text-xs text-gray-300">${keyword}</span>`
          ).join('')}
        </div>
      </div>
    `;

    this.popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'persona-popup-container',
      offset: [0, -10]
    })
      .setHTML(popupContent);
  }

  /**
   * Add marker to map
   */
  addTo(map: Map): this {
    this.marker.addTo(map);
    return this;
  }

  /**
   * Remove marker from map
   */
  remove(): void {
    if (this.popup) {
      this.popup.remove();
    }
    this.marker.remove();
  }

  /**
   * Update marker position
   */
  setLngLat(lngLat: [number, number]): this {
    this.marker.setLngLat(lngLat);
    return this;
  }

  /**
   * Show popup
   */
  showPopup(map: Map): void {
    if (this.popup) {
      this.popup.addTo(map);
      this.marker.setPopup(this.popup);
    }
  }

  /**
   * Hide popup
   */
  hidePopup(): void {
    if (this.popup) {
      this.popup.remove();
    }
  }
}

/**
 * Persona Chip Cluster for multiple personas at one location
 */
export class PersonaChipCluster {
  private marker: Marker;
  private element: HTMLDivElement;
  private personas: PersonaDef[];
  private expanded: boolean = false;
  private childMarkers: PersonaChipMarker[] = [];

  constructor(
    personas: PersonaDef[],
    position: { lat: number; lng: number },
    onPersonaClick?: (persona: PersonaDef) => void,
    onClusterClick?: () => void
  ) {
    this.personas = personas;
    this.element = document.createElement('div');
    this.element.className = 'persona-chip-cluster';
    
    if (personas.length === 1) {
      // Single persona - show as regular chip
      this.createSingleChip(personas[0], onPersonaClick);
    } else {
      // Multiple personas - show as cluster
      this.createClusterChip(personas, onPersonaClick, onClusterClick);
    }

    this.marker = new Marker(this.element)
      .setLngLat([position.lng, position.lat]);
  }

  /**
   * Create single persona chip
   */
  private createSingleChip(persona: PersonaDef, onClick?: (persona: PersonaDef) => void): void {
    this.element.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      background-size: cover;
      background-position: center;
      background-image: url(${persona.icon});
      background-color: #1F1F2E;
      transition: all 0.3s ease;
    `;
    
    this.element.addEventListener('click', () => {
      onClick?.(persona);
    });

    this.element.title = `${persona.name} - ${persona.category}`;
  }

  /**
   * Create cluster chip for multiple personas
   */
  private createClusterChip(
    personas: PersonaDef[], 
    onPersonaClick?: (persona: PersonaDef) => void,
    onClusterClick?: () => void
  ): void {
    this.element.style.cssText = `
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      background: linear-gradient(135deg, #4F9BFF 0%, #D946EF 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      transition: all 0.3s ease;
      position: relative;
    `;
    
    this.element.textContent = personas.length.toString();
    this.element.title = `${personas.length} personas available: ${personas.map(p => p.name).join(', ')}`;
    
    // Add pulsing ring effect
    const pulseRing = document.createElement('div');
    pulseRing.style.cssText = `
      position: absolute;
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
      border: 2px solid rgba(79, 155, 255, 0.6);
      border-radius: 50%;
      animation: persona-pulse 2s infinite;
    `;
    this.element.appendChild(pulseRing);

    // Add CSS animation for pulse
    if (!document.querySelector('#persona-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'persona-pulse-animation';
      style.textContent = `
        @keyframes persona-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.element.addEventListener('click', () => {
      this.toggleExpanded(onPersonaClick);
      onClusterClick?.();
    });
  }

  /**
   * Toggle cluster expansion
   */
  private toggleExpanded(onPersonaClick?: (persona: PersonaDef) => void): void {
    if (this.expanded) {
      // Collapse - remove child markers
      this.childMarkers.forEach(marker => marker.remove());
      this.childMarkers = [];
      this.expanded = false;
      this.element.style.transform = 'scale(1)';
    } else {
      // Expand - show individual persona markers around cluster
      this.expanded = true;
      this.element.style.transform = 'scale(1.1)';
      
      // Note: Creating child markers would require map reference
      // For now, we'll just show expanded state visually
      console.log('Cluster expanded:', this.personas.map(p => p.name));
    }
  }

  /**
   * Add cluster to map
   */
  addTo(map: Map): this {
    this.marker.addTo(map);
    return this;
  }

  /**
   * Remove cluster from map
   */
  remove(): void {
    this.marker.remove();
    this.childMarkers.forEach(marker => marker.remove());
  }
}

/**
 * Utility function to create persona chips for organizations
 */
function createPersonaChipsForOrg(
  orgPosition: { lat: number; lng: number },
  activePersonaKeys: PersonaKey[],
  onPersonaClick?: (persona: PersonaDef) => void
): PersonaChipCluster | PersonaChipMarker | null {
  const activePersonas = activePersonaKeys
    .map(key => getPersonaByKey(key))
    .filter(Boolean) as PersonaDef[];

  if (activePersonas.length === 0) {
    return null;
  }

  if (activePersonas.length === 1) {
    return new PersonaChipMarker(
      activePersonas[0],
      orgPosition,
      onPersonaClick
    );
  }

  return new PersonaChipCluster(
    activePersonas,
    orgPosition,
    onPersonaClick
  );
}

/**
 * Add persona chips to map for all organizations with active personas
 */
export function addPersonaChipsToMap(
  map: Map,
  organizations: Array<{
    id: string;
    lat: number;
    lng: number;
    activePersonas: PersonaKey[];
  }>,
  onPersonaClick?: (persona: PersonaDef) => void
): (PersonaChipMarker | PersonaChipCluster)[] {
  const markers: (PersonaChipMarker | PersonaChipCluster)[] = [];

  organizations.forEach(org => {
    if (org.activePersonas.length > 0) {
      const marker = createPersonaChipsForOrg(
        { lat: org.lat, lng: org.lng },
        org.activePersonas,
        onPersonaClick
      );
      
      if (marker) {
        marker.addTo(map);
        markers.push(marker);
      }
    }
  });

  return markers;
}