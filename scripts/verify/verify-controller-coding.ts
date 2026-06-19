/**
 * verify-controller-coding.ts
 * Checks that IDE controller actions are registered and bound.
 */
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const ACTION_REGISTRY_PATH = path.resolve(__dirname, '../../src/renderer/utils/controller/action-registry.ts');
const REQUIRED_IDE_ACTIONS = [
  'IDE_ACCEPT_COMPLETION',
  'IDE_NEXT_COMPLETION',
  'IDE_PREV_COMPLETION',
  'IDE_DISMISS_COMPLETION',
  'IDE_OPEN_COMMAND_WHEEL',
  'IDE_FORMAT_FILE',
  'IDE_RUN_COMMAND',
  'IDE_NEXT_DIAGNOSTIC',
  'IDE_GO_TO_DEFINITION',
  'IDE_TOGGLE_PREDICTIVE_BAR',
  'IDE_SAVE_FILE',
  'IDE_PREV_TAB',
  'IDE_NEXT_TAB',
  'IDE_CANCEL_COMMAND',
  'IDE_CONFIRM_COMMAND',
  'IDE_ENTER_EDIT_MODE',
  'IDE_ENTER_NAVIGATION_MODE',
];

const REQUIRED_CONTROLLER_COMPONENTS = [
  'ControllerHintBar.tsx',
  'PredictiveBar.tsx',
  'RadialCommandWheel.tsx',
];

const IDE_VIEW_PATH = path.resolve(__dirname, '../../src/renderer/features/ide/IDEView.tsx');

function checkFileContains(filePath: string, patterns: string[], label: string) {
  if (!fs.existsSync(filePath)) {
    fail(`${label}: file not found at ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      pass(`${label}: contains "${pattern}"`);
    } else {
      fail(`${label}: missing "${pattern}"`);
    }
  }
}

function main() {
  info('--- Action Registry ---');
  checkFileContains(ACTION_REGISTRY_PATH, REQUIRED_IDE_ACTIONS, 'action-registry.ts');

  info('--- IDE mode category ---');
  const registryContent = fs.readFileSync(ACTION_REGISTRY_PATH, 'utf8');
  if (registryContent.includes("'ide'")) {
    pass('action-registry.ts: ide category present');
  } else {
    fail("action-registry.ts: missing 'ide' category in ActionCategory type");
  }

  info('--- Steam Deck IDE bindings ---');
  const deckBindings = [
    'ide_prediction',
    'ide_edit',
    'ide_navigation',
    'ide_command',
    'ide_snippet',
  ];
  for (const binding of deckBindings) {
    if (registryContent.includes(binding)) {
      pass(`defaultSteamDeckProfile: has ${binding} mode bindings`);
    } else {
      fail(`defaultSteamDeckProfile: missing ${binding} mode bindings`);
    }
  }

  info('--- Controller UI components ---');
  const ideDir = path.resolve(__dirname, '../../src/renderer/features/ide');
  for (const component of REQUIRED_CONTROLLER_COMPONENTS) {
    const componentPath = path.join(ideDir, component);
    if (fs.existsSync(componentPath)) {
      pass(`UI component exists: ${component}`);
    } else {
      fail(`UI component missing: ${component}`);
    }
  }

  info('--- IDEView wiring ---');
  checkFileContains(IDE_VIEW_PATH, [
    'ControllerHintBar',
    'PredictiveBar',
    'RadialCommandWheel',
    'SafeCommandConfirmModal',
    'ideMode',
    'predictions',
    'showRadialWheel',
  ], 'IDEView.tsx');

  info('--- Preload IDE/controller namespaces ---');
  const preloadPath = path.resolve(__dirname, '../../electron/preload.js');
  checkFileContains(preloadPath, [
    "ide:",
    'detectProject',
    'runCommand',
    'cancelCommand',
    'getPredictions',
    'controller:',
    'setIdeMode',
    'getIdeActionMap',
  ], 'preload.js');

  console.log(`\n=== verify-controller-coding: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    console.error(`${failures} failure(s) found.`);
    process.exit(1);
  }
}

main();
