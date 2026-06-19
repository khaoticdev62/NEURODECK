#!/usr/bin/env tsx
/**
 * Generate JSON backend inventory and connection matrix reports.
 */
import * as fs from 'fs';
import * as path from 'path';
import { BACKEND_SERVICE_INVENTORY } from '../../src/main/services/backend/backendHealthRegistry';

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports', 'backend');
fs.mkdirSync(REPORTS, { recursive: true });

// Backend inventory JSON
const inventory = {
  generatedAt: new Date().toISOString(),
  version: '1.8.0',
  totalServices: BACKEND_SERVICE_INVENTORY.length,
  services: BACKEND_SERVICE_INVENTORY,
};
fs.writeFileSync(path.join(REPORTS, 'backend-inventory.json'), JSON.stringify(inventory, null, 2), 'utf8');

// Connection matrix JSON
const matrix = BACKEND_SERVICE_INVENTORY.map(svc => ({
  id: svc.id,
  label: svc.label,
  category: svc.category,
  callerLayer: svc.callerLayer,
  ipcChannels: svc.ipcChannels,
  preloadMethods: svc.preloadMethods,
  provider: svc.provider,
  storageUsed: svc.storageUsed,
  dataSourceType: svc.dataSourceType,
  status: svc.status,
  mockRiskLevel: svc.mockRiskLevel,
  envVarsRequired: svc.envVarsRequired,
  knownBlockers: svc.knownBlockers,
}));
fs.writeFileSync(
  path.join(REPORTS, 'backend-connection-matrix.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), connections: matrix }, null, 2),
  'utf8'
);

console.log(`✓ backend-inventory.json (${BACKEND_SERVICE_INVENTORY.length} services)`);
console.log(`✓ backend-connection-matrix.json`);
