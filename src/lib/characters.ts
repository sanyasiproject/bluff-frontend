// Character avatars (girls and boys): the fixed look of each one. Not bundled; `npm run avatars` draws them to public/avatars/*.svg
// Art: Avataaars by Pablo Stanley (free for personal and commercial use) · Notionists by Zoish (CC0 1.0)
import * as avataaars from '@dicebear/avataaars';
import type { Options as ToonOptions } from '@dicebear/avataaars';
import { createAvatar, type StyleOptions } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';
import type { Options as SketchOptions } from '@dicebear/notionists';

type Toon = { style: 'toon'; options: Partial<StyleOptions<ToonOptions>> };
type Sketch = { style: 'sketch'; options: Partial<StyleOptions<SketchOptions>> };
export type CharacterArt = Toon | Sketch;

// cartoon people: everything fixed so each one always looks the same
const TOON_BASE: Partial<StyleOptions<ToonOptions>> = {
  style: ['default'],
  accessoriesProbability: 0,
  facialHairProbability: 0,
  topProbability: 100,
  eyebrows: ['defaultNatural'],
  nose: ['default'],
};
const T = (options: Partial<StyleOptions<ToonOptions>>): Toon => ({ style: 'toon', options: { ...TOON_BASE, ...options } });

// hand-drawn people doing something (waving, pointing, on the phone)
const S = (seed: string, hair: string, gesture: string, extra: Partial<StyleOptions<SketchOptions>> = {}): Sketch => ({
  style: 'sketch',
  options: {
    seed,
    hair: [hair] as SketchOptions['hair'],
    gesture: [gesture] as SketchOptions['gesture'],
    gestureProbability: 100,
    glassesProbability: 0,
    beardProbability: 0,
    bodyIconProbability: 0,
    ...extra,
  },
});

/** every id in AVATAR_CHARACTERS (types.ts) has its drawing here */
export const CHARACTER_ART: Record<string, CharacterArt> = {
  aarav: T({ top: ['shortFlat'], hairColor: ['2c1b18'], skinColor: ['d08b5b'], clothing: ['hoodie'], clothesColor: ['3c4f5c'], eyes: ['happy'], mouth: ['smile'] }),
  diya: T({ top: ['straight01'], hairColor: ['2c1b18'], skinColor: ['edb98a'], clothing: ['shirtScoopNeck'], clothesColor: ['ff488e'], eyes: ['happy'], mouth: ['smile'] }),
  kabir: T({
    top: ['shortCurly'],
    hairColor: ['2c1b18'],
    skinColor: ['ae5d29'],
    clothing: ['graphicShirt'],
    clothingGraphic: ['pizza'],
    clothesColor: ['ffffb1'],
    eyes: ['wink'],
    mouth: ['twinkle'],
  }),
  zoya: T({ top: ['bun'], hairColor: ['4a312c'], skinColor: ['edb98a'], clothing: ['overall'], clothesColor: ['65c9ff'], eyes: ['default'], mouth: ['smile'] }),
  rohan: T({
    top: ['theCaesarAndSidePart'],
    hairColor: ['2c1b18'],
    skinColor: ['d08b5b'],
    clothing: ['blazerAndShirt'],
    clothesColor: ['262e33'],
    accessories: ['sunglasses'],
    accessoriesProbability: 100,
    accessoriesColor: ['262e33'],
    eyes: ['default'],
    mouth: ['smile'],
  }),
  meera: T({
    top: ['bob'],
    hairColor: ['2c1b18'],
    skinColor: ['ffdbb4'],
    clothing: ['collarAndSweater'],
    clothesColor: ['ffafb9'],
    accessories: ['round'],
    accessoriesProbability: 100,
    accessoriesColor: ['262e33'],
    eyes: ['happy'],
    mouth: ['smile'],
  }),
  ayaan: T({
    top: ['winterHat02'],
    hatColor: ['25557c'],
    hairColor: ['2c1b18'],
    skinColor: ['edb98a'],
    clothing: ['hoodie'],
    clothesColor: ['ff5c5c'],
    eyes: ['surprised'],
    mouth: ['twinkle'],
  }),
  sara: T({ top: ['hijab'], hatColor: ['25557c'], skinColor: ['edb98a'], clothing: ['shirtVNeck'], clothesColor: ['a7ffc4'], eyes: ['happy'], mouth: ['smile'] }),
  priya: S('priya', 'variant39', 'waveLongArms'),
  karan: S('karan', 'variant52', 'handPhone'),
  neha: S('neha', 'variant45', 'okLongArm'),
  sam: S('sam', 'variant17', 'pointLongArm', { glassesProbability: 100, glasses: ['variant01'] }),
  fatima: S('fatima', 'variant62', 'waveLongArm'),
  vikram: T({
    top: ['shortRound'],
    hairColor: ['2c1b18'],
    skinColor: ['d08b5b'],
    facialHair: ['beardMedium'],
    facialHairProbability: 100,
    facialHairColor: ['2c1b18'],
    accessories: ['wayfarers'],
    accessoriesProbability: 100,
    accessoriesColor: ['262e33'],
    clothing: ['blazerAndSweater'],
    clothesColor: ['929598'],
    eyes: ['default'],
    mouth: ['serious'],
  }),
  anaya: T({
    top: ['curly'],
    hairColor: ['a55728'],
    skinColor: ['ffdbb4'],
    clothing: ['graphicShirt'],
    clothingGraphic: ['bear'],
    clothesColor: ['ffdeb5'],
    eyes: ['happy'],
    mouth: ['twinkle'],
  }),
  riya: S('riya', 'variant59', 'wavePointLongArms'),
  aman: S('aman', 'variant50', 'waveOkLongArms'),
  arjun: T({
    top: ['turban'],
    hatColor: ['ff5c5c'],
    skinColor: ['d08b5b'],
    facialHair: ['beardMajestic'],
    facialHairProbability: 100,
    facialHairColor: ['2c1b18'],
    clothing: ['shirtCrewNeck'],
    clothesColor: ['ffffff'],
    eyes: ['happy'],
    mouth: ['smile'],
  }),
  tara: T({ top: ['frida'], hairColor: ['2c1b18'], skinColor: ['ae5d29'], clothing: ['shirtScoopNeck'], clothesColor: ['ff5c5c'], eyes: ['default'], mouth: ['smile'] }),
  pooja: S('pooja', 'variant28', 'handPhone', { glassesProbability: 100, glasses: ['variant05'] }),
  rahul: S('rahul', 'variant05', 'waveLongArm', { beardProbability: 100, beard: ['variant03'] }),
  nia: T({ top: ['fro'], hairColor: ['2c1b18'], skinColor: ['ae5d29'], clothing: ['hoodie'], clothesColor: ['ffffb1'], eyes: ['squint'], mouth: ['tongue'] }),
  yash: T({
    top: ['shortWaved'],
    hairColor: ['2c1b18'],
    skinColor: ['edb98a'],
    clothing: ['graphicShirt'],
    clothingGraphic: ['diamond'],
    clothesColor: ['5199e4'],
    eyes: ['wink'],
    mouth: ['smile'],
  }),
  nikhil: S('nikhil', 'variant38', 'okLongArm'),
  anjali: S('anjali', 'variant47', 'pointLongArm'),
  raj: T({
    top: ['dreads02'],
    hairColor: ['2c1b18'],
    skinColor: ['d08b5b'],
    facialHair: ['moustacheFancy'],
    facialHairProbability: 100,
    facialHairColor: ['2c1b18'],
    clothing: ['graphicShirt'],
    clothingGraphic: ['skull'],
    clothesColor: ['262e33'],
    eyes: ['side'],
    mouth: ['smile'],
  }),
  ishita: T({ top: ['miaWallace'], hairColor: ['2c1b18'], skinColor: ['edb98a'], clothing: ['blazerAndShirt'], clothesColor: ['ff488e'], eyes: ['hearts'], mouth: ['smile'] }),
  veer: S('veer', 'variant44', 'wavePointLongArms', { glassesProbability: 100, glasses: ['variant09'] }),
};

/** one character as SVG text, on a clear background */
export function drawArt(art: CharacterArt): string {
  return art.style === 'toon'
    ? createAvatar(avataaars, { backgroundColor: ['transparent'], ...art.options }).toString()
    : createAvatar(notionists, { backgroundColor: ['transparent'], ...art.options }).toString();
}
