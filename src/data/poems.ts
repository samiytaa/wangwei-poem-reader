import poemsVol7 from './poems_vol7.json';
import poemsVol9 from './poems_vol9.json';
import poemsVol8 from './poems_vol8.json';
import poemsVol15 from './poems_vol15.json';
import { Poem } from '../types';

export const POEMS: Poem[] = [
  ...(poemsVol7 as Poem[]),
  ...(poemsVol9 as Poem[]),
  ...(poemsVol8 as Poem[]),
  ...(poemsVol15 as Poem[])
];

export const VOLUMES = ["卷七 近体诗三十九首", "卷九 近体诗三十五首", "卷八 近体诗三十三首", "卷十五 外编四十七首"];
export const TOTAL = POEMS.length;
