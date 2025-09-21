export type AppRole = 'master_admin' | 'org_admin' | 'staff' | 'student' | 'unknown' | undefined;

// Returns the default route for a given role
export const routeForRole = (role: AppRole): string => {
  if (role === 'master_admin') return '/master/dashboard';
  if (role === 'org_admin' || role === 'staff') return '/org/dashboard';
  return '/dashboard';
};
