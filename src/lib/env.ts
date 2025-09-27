// Unified environment accessor that works in Vite, Node/Jest, and browser
export const env = {
  get(name: string): string | undefined {
    // Prefer Vite's injected env if available (can be shimmed in tests if desired)
    const viteEnv = (globalThis as any).importMetaEnv;
    if (viteEnv && typeof viteEnv[name] !== 'undefined') return viteEnv[name];

    // Process.env for Node/Jest
    if (typeof process !== 'undefined' && process.env && typeof process.env[name] !== 'undefined') {
      return process.env[name];
    }

    // NEXT_PUBLIC_* compatibility if exposed globally somewhere
    if (typeof (globalThis as any)[name] !== 'undefined') {
      return (globalThis as any)[name];
    }

    return undefined;
  },
};
