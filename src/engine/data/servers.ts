/** Server presets (research/05). Every knob remains user-editable on top of a preset. */
import type { ServerConfig } from '../types';

export const serverPresets: Record<string, ServerConfig> = {
  'regular-3tribe-x1': { speed: 1, tribes: ['romans', 'gauls', 'teutons'], advancedStart: false, taskRewardSpeedScaling: false },
  'regular-5tribe-x1': { speed: 1, tribes: ['romans', 'gauls', 'teutons', 'egyptians', 'huns'], advancedStart: false, taskRewardSpeedScaling: false },
  'regular-5tribe-x2': { speed: 2, tribes: ['romans', 'gauls', 'teutons', 'egyptians', 'huns'], advancedStart: false, taskRewardSpeedScaling: false },
  'regular-5tribe-x3': { speed: 3, tribes: ['romans', 'gauls', 'teutons', 'egyptians', 'huns'], advancedStart: false, taskRewardSpeedScaling: false },
  'local-6tribe-x5-advstart': { speed: 5, tribes: ['romans', 'gauls', 'teutons', 'egyptians', 'huns', 'spartans'], advancedStart: true, taskRewardSpeedScaling: false },
  'local-6tribe-x10-advstart': { speed: 10, tribes: ['romans', 'gauls', 'teutons', 'egyptians', 'huns', 'spartans'], advancedStart: true, taskRewardSpeedScaling: false },
};

/** Starting resources: 750 each, all speeds/servers (player-confirmed, research/07). */
export const STARTING_RESOURCES = 750;

/** Hidden level-0 storage before any Warehouse/Granary (community consensus, research/02). */
export const BASE_STORAGE = 800;
