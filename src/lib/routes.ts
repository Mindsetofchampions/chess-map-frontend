export type AppRole = 'master_admin' | 'org_admin' | 'staff' | 'student' | 'unknown' | undefined;

// Returns the default route for a given role
export const routeForRole = (role: AppRole): string => {
  if (role === 'master_admin') return '/master/dashboard';
  if (role === 'org_admin' || role === 'staff') return '/org/dashboard';
  return '/dashboard';
};

// Returns whether a role can access a given path (coarse-grained route guard mirror)
export const canAccessPath = (role: AppRole, path: string): boolean => {
  if (!path) return false;
  const r = role ?? 'unknown';
  // Master-only sections
  if (path.startsWith('/master/')) {
    return r === 'master_admin';
  }
  // Org/staff sections
  if (path.startsWith('/org/')) {
    return r === 'master_admin' || r === 'org_admin' || r === 'staff';
  }
  // Admin diagnostics (currently any authenticated user allowed in app router)
  if (path.startsWith('/admin/')) {
    return r !== 'unknown';
  }
  // Auth pages always allowed
  if (path === '/login' || path === '/signup') return true;
  // Public landing and map are allowed for everyone
  if (path === '/' || path.startsWith('/map')) return true;
  // Default: require authentication for other app pages
  return r !== 'unknown';
};
