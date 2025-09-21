import { routeForRole } from '../routes';

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
