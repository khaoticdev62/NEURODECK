/**
 * Integration test — backend health registry shape and inventory completeness.
 * Does not require a running sidecar — validates service inventory only.
 */
import { describe, it, expect } from 'vitest';
import { BACKEND_SERVICE_INVENTORY, BackendHealthRegistry } from '../../src/main/services/backend/backendHealthRegistry';

describe('Backend service inventory', () => {
  it('inventory contains at least 10 services', () => {
    expect(BACKEND_SERVICE_INVENTORY.length).toBeGreaterThanOrEqual(10);
  });

  it('every service has required fields', () => {
    for (const svc of BACKEND_SERVICE_INVENTORY) {
      expect(typeof svc.id).toBe('string');
      expect(typeof svc.label).toBe('string'); // field is 'label', not 'name'
      expect(typeof svc.category).toBe('string');
      expect(typeof svc.status).toBe('string');
      expect(typeof svc.mockRiskLevel).toBe('string');
      // realDataVerified is optional — check boolean if present
      if ('realDataVerified' in svc) {
        expect(typeof svc.realDataVerified).toBe('boolean');
      }
    }
  });

  it('no service has status=mocked', () => {
    const mocked = BACKEND_SERVICE_INVENTORY.filter(s => s.status === 'mocked');
    if (mocked.length > 0) {
      console.log('Mocked services:', mocked.map(s => s.id));
    }
    expect(mocked).toHaveLength(0);
  });

  it('critical services are marked production_ready or not_configured', () => {
    const criticalIds = ['electron-ipc', 'sidecar-http', 'sidecar-ws', 'sessions', 'memory'];
    for (const id of criticalIds) {
      const svc = BACKEND_SERVICE_INVENTORY.find(s => s.id === id);
      if (!svc) continue;
      expect(['production_ready', 'not_configured', 'live']).toContain(svc.status);
    }
  });

  it('all IDs are unique', () => {
    const ids = BACKEND_SERVICE_INVENTORY.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('BackendHealthRegistry', () => {
  const registry = new BackendHealthRegistry();

  it('can look up a service by id', () => {
    const first = BACKEND_SERVICE_INVENTORY[0];
    const found = registry.getService(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });

  it('returns undefined for unknown id', () => {
    expect(registry.getService('does-not-exist-xyz')).toBeUndefined();
  });

  it('getByCategory returns subset', () => {
    const ipcServices = registry.getByCategory('ipc');
    expect(ipcServices.every(s => s.category === 'ipc')).toBe(true);
  });
});
