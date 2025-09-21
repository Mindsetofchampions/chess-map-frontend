// Minimal shims to help TypeScript in editors understand Deno global and remote URL modules
declare const Deno: any;

declare module 'https://deno.land/std@0.201.0/http/server.ts' {
  export function serve(handler: any): any;
}
declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(handler: any): any;
}
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: any): any;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(...args: any[]): any;
  const _default: any;
  export default _default;
}

// Fallback for other remote modules used by functions
declare module 'https://*' {
  const whatever: any;
  export default whatever;
}
