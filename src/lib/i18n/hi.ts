import * as cards from './hi.cards';
import * as common from './hi.common';
import * as crazy7 from './hi.crazy7';
import * as errors from './hi.errors';
import * as extra from './hi.extra';
import * as home from './hi.home';
import * as league from './hi.league';
import * as lobby1 from './hi.lobby1';
import * as lobby2 from './hi.lobby2';
import * as missions from './hi.missions';
import * as over from './hi.over';
import * as profile from './hi.profile';
import * as server from './hi.server';
import * as shop from './hi.shop';
import * as social from './hi.social';
import * as table from './hi.table';
import * as titles from './hi.titles';
import type { Dict, Pattern } from './types';

// later files win on the same exact line
const dicts: Dict[] = [common.D, cards.D, titles.D, home.D, lobby1.D, lobby2.D, table.D, over.D, crazy7.D, profile.D, social.D, missions.D, shop.D, league.D, extra.D, errors.D];

export const HI_DICT = new Map<string, string>(dicts.flatMap((d) => Object.entries(d)));

// specific screens first, the server's broad lines last
export const HI_PATTERNS: Pattern[] = [
  ...cards.P,
  ...table.P,
  ...crazy7.P,
  ...over.P,
  ...lobby2.P,
  ...profile.P,
  ...social.P,
  ...missions.P,
  ...shop.P,
  ...league.P,
  ...home.P,
  ...titles.P,
  ...extra.P,
  ...errors.P,
  ...server.P,
];
