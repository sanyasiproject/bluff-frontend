import * as cards from './hi.cards';
import * as common from './hi.common';
import * as crazy7 from './hi.crazy7';
import * as rang from './hi.rang';
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
import * as land from './hi.land';
import * as landHome from './hi.landHome';
import * as landLobby from './hi.landLobby';
import * as landPages from './hi.landPages';
import * as landPages2 from './hi.landPages2';
import * as landOverlays from './hi.landOverlays';
import * as landTable from './hi.landTable';
import * as landC7 from './hi.landC7';
import * as landRang from './hi.landRang';
import type { Dict, Pattern } from './types';

// later files win on the same exact line
const dicts: Dict[] = [common.D, cards.D, titles.D, home.D, lobby1.D, lobby2.D, table.D, over.D, crazy7.D, rang.D, profile.D, social.D, missions.D, shop.D, league.D, extra.D, land.D, landHome.D, landLobby.D, landPages.D, landPages2.D, landOverlays.D, landTable.D, landC7.D, landRang.D, errors.D];

export const HI_DICT = new Map<string, string>(dicts.flatMap((d) => Object.entries(d)));

// specific screens first, the server's broad lines last
export const HI_PATTERNS: Pattern[] = [
  ...cards.P,
  ...table.P,
  // before Crazy 7's, whose card patterns would match Rang's lines first
  ...rang.P,
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
