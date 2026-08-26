/** Per-tribe data relevant to the early-game simulator.
 *  Sources: research/04 (settlers: costs triple-confirmed; Egyptian/Spartan TIMES kirilloid-live-only,
 *  flagged UNVERIFIED there), research/02 (merchants: official). */
import type { Resources, Tribe } from '../types';

export interface TribeData {
  /** Cost per settler (3 needed). */
  settlerCost: Resources;
  /** Base training seconds at 1x, Residence/Palace/CC level 1 (×0.9 per level — verified in-game, research/07). */
  settlerTimeBase: number;
  merchant: { capacity: number; speed: number };
  /** Romans: one building + one resource field simultaneously (official). */
  dualQueue: boolean;
}

export const tribes: Record<Tribe, TribeData> = {
  romans:    { settlerCost: { wood: 4600, clay: 4200, iron: 5800, crop: 4400 }, settlerTimeBase: 26900, merchant: { capacity: 500,  speed: 16 }, dualQueue: true },
  teutons:   { settlerCost: { wood: 5800, clay: 4400, iron: 4600, crop: 5200 }, settlerTimeBase: 31000, merchant: { capacity: 1000, speed: 12 }, dualQueue: false },
  gauls:     { settlerCost: { wood: 4400, clay: 5600, iron: 4200, crop: 3900 }, settlerTimeBase: 22700, merchant: { capacity: 750,  speed: 24 }, dualQueue: false },
  egyptians: { settlerCost: { wood: 5040, clay: 6510, iron: 4830, crop: 4620 }, settlerTimeBase: 24800, merchant: { capacity: 750,  speed: 16 }, dualQueue: false },
  huns:      { settlerCost: { wood: 6100, clay: 4600, iron: 4800, crop: 5400 }, settlerTimeBase: 28950, merchant: { capacity: 500,  speed: 20 }, dualQueue: false },
  spartans:  { settlerCost: { wood: 5115, clay: 5580, iron: 6045, crop: 3255 }, settlerTimeBase: 34100, merchant: { capacity: 500,  speed: 14 }, dualQueue: false },
};
