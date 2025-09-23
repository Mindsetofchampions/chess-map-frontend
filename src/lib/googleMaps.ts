// Simple Google Maps JS API loader (Places library)
// Ensures the script is loaded once and returns the global google object

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;
let googleMapsPromise: Promise<typeof google> | null = null;

export function loadGoogleMapsPlaces(apiKey: string): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return Promise.resolve((window as any).google);
  }
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const cbName = `initGMaps_${Math.random().toString(36).slice(2)}`;
    (window as any)[cbName] = () => {
      if ((window as any).google?.maps?.places) {
        resolve((window as any).google);
      } else {
        reject(new Error('Google Maps Places failed to load'));
      }
      try { delete (window as any)[cbName]; } catch {}
    };
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${cbName}`;
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
