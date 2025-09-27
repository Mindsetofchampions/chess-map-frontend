import { routeForRole, canAccessPath } from '../routes';

describe('routeForRole', () => {
  it('routes master_admin to master dashboard', () => {
    expect(routeForRole('master_admin')).toBe('/master/dashboard');
  });
  it('routes org_admin to org dashboard', () => {
    expect(routeForRole('org_admin')).toBe('/org/dashboard');
  });
  it('routes staff to org dashboard', () => {
    expect(routeForRole('staff')).toBe('/org/dashboard');
  });
  it('routes student to dashboard', () => {
    expect(routeForRole('student')).toBe('/dashboard');
  });
  it('routes unknown to dashboard', () => {
    expect(routeForRole('unknown')).toBe('/dashboard');
  });
  it('routes undefined role to dashboard', () => {
    expect(routeForRole(undefined)).toBe('/dashboard');
  });
});

describe('canAccessPath', () => {
  it('allows master to access master routes', () => {
    expect(canAccessPath('master_admin', '/master/dashboard')).toBe(true);
  });
  it('denies org_admin to access master routes', () => {
    expect(canAccessPath('org_admin', '/master/dashboard')).toBe(false);
  });
  it('allows org_admin and staff to access org routes', () => {
    expect(canAccessPath('org_admin', '/org/dashboard')).toBe(true);
    expect(canAccessPath('staff', '/org/dashboard')).toBe(true);
  });
  it('denies student to access org routes', () => {
    expect(canAccessPath('student', '/org/dashboard')).toBe(false);
  });
  it('allows public routes for everyone', () => {
    expect(canAccessPath('unknown', '/')).toBe(true);
    expect(canAccessPath(undefined, '/map')).toBe(true);
  });
  it('requires auth for default app pages', () => {
    expect(canAccessPath('unknown', '/dashboard')).toBe(false);
    expect(canAccessPath('student', '/dashboard')).toBe(true);
  });
});
