import type { ImageSourcePropType } from "react-native";
import type { CardTier } from "../logic/overall";

/**
 * PlayStyle name -> icon image. The PNGs are the custom icon set in
 * assets/playstyles/ (diamond-shield badges with transparent
 * backgrounds); this dict is the single source of truth for lookups.
 */
export const ICON_IMAGES: Record<string, ImageSourcePropType> = {
  // Scoring
  Finesse: require("../../assets/playstyles/finesse.png"),
  "Power Shot": require("../../assets/playstyles/power-shot.png"),
  "Chip Shot": require("../../assets/playstyles/chip-shot.png"),
  "Dead Ball": require("../../assets/playstyles/dead-ball.png"),
  "Low Driven": require("../../assets/playstyles/low-driven.png"),
  "Precision Header": require("../../assets/playstyles/precision-header.png"),
  Gamechanger: require("../../assets/playstyles/gamechanger.png"),
  Acrobatic: require("../../assets/playstyles/acrobatic.png"),
  // Passing
  Incisive: require("../../assets/playstyles/incisive.png"),
  "Pinged Pass": require("../../assets/playstyles/pinged-pass.png"),
  "Long Ball": require("../../assets/playstyles/long-ball.png"),
  "Tiki Taka": require("../../assets/playstyles/tiki-taka.png"),
  "Whipped Pass": require("../../assets/playstyles/whipped-pass.png"),
  Inventive: require("../../assets/playstyles/inventive.png"),
  // Ball Control
  "First Touch": require("../../assets/playstyles/first-touch.png"),
  "Press Proven": require("../../assets/playstyles/press-proven.png"),
  Rapid: require("../../assets/playstyles/rapid.png"),
  Technical: require("../../assets/playstyles/technical.png"),
  Trickster: require("../../assets/playstyles/trickster.png"),
  // Defending
  "Aerial Fortress": require("../../assets/playstyles/aerial-fortress.png"),
  Block: require("../../assets/playstyles/block.png"),
  Intercept: require("../../assets/playstyles/intercept.png"),
  Jockey: require("../../assets/playstyles/jockey.png"),
  "Slide Tackle": require("../../assets/playstyles/slide-tackle.png"),
  Anticipate: require("../../assets/playstyles/anticipate.png"),
  // Physical
  Bruiser: require("../../assets/playstyles/bruiser.png"),
  Enforcer: require("../../assets/playstyles/enforcer.png"),
  "Quick Step": require("../../assets/playstyles/quick-step.png"),
  Relentless: require("../../assets/playstyles/relentless.png"),
  "Long Throw": require("../../assets/playstyles/long-throw.png"),
  // Goalkeeper
  "Far Throw": require("../../assets/playstyles/far-throw.png"),
  Footwork: require("../../assets/playstyles/footwork.png"),
  "Cross Claimer": require("../../assets/playstyles/cross-claimer.png"),
  "Rush Out": require("../../assets/playstyles/rush-out.png"),
  "Far Reach": require("../../assets/playstyles/far-reach.png"),
  Deflector: require("../../assets/playstyles/deflector.png"),
};

/** Silver copies, made by scripts/recolor-playstyles.js. */
const SILVER_ICONS: Record<string, ImageSourcePropType> = {
  Finesse: require("../../assets/playstyles/silver/finesse.png"),
  "Power Shot": require("../../assets/playstyles/silver/power-shot.png"),
  "Chip Shot": require("../../assets/playstyles/silver/chip-shot.png"),
  "Dead Ball": require("../../assets/playstyles/silver/dead-ball.png"),
  "Low Driven": require("../../assets/playstyles/silver/low-driven.png"),
  "Precision Header": require("../../assets/playstyles/silver/precision-header.png"),
  Gamechanger: require("../../assets/playstyles/silver/gamechanger.png"),
  Acrobatic: require("../../assets/playstyles/silver/acrobatic.png"),
  Incisive: require("../../assets/playstyles/silver/incisive.png"),
  "Pinged Pass": require("../../assets/playstyles/silver/pinged-pass.png"),
  "Long Ball": require("../../assets/playstyles/silver/long-ball.png"),
  "Tiki Taka": require("../../assets/playstyles/silver/tiki-taka.png"),
  "Whipped Pass": require("../../assets/playstyles/silver/whipped-pass.png"),
  Inventive: require("../../assets/playstyles/silver/inventive.png"),
  "First Touch": require("../../assets/playstyles/silver/first-touch.png"),
  "Press Proven": require("../../assets/playstyles/silver/press-proven.png"),
  Rapid: require("../../assets/playstyles/silver/rapid.png"),
  Technical: require("../../assets/playstyles/silver/technical.png"),
  Trickster: require("../../assets/playstyles/silver/trickster.png"),
  "Aerial Fortress": require("../../assets/playstyles/silver/aerial-fortress.png"),
  Block: require("../../assets/playstyles/silver/block.png"),
  Intercept: require("../../assets/playstyles/silver/intercept.png"),
  Jockey: require("../../assets/playstyles/silver/jockey.png"),
  "Slide Tackle": require("../../assets/playstyles/silver/slide-tackle.png"),
  Anticipate: require("../../assets/playstyles/silver/anticipate.png"),
  Bruiser: require("../../assets/playstyles/silver/bruiser.png"),
  Enforcer: require("../../assets/playstyles/silver/enforcer.png"),
  "Quick Step": require("../../assets/playstyles/silver/quick-step.png"),
  Relentless: require("../../assets/playstyles/silver/relentless.png"),
  "Long Throw": require("../../assets/playstyles/silver/long-throw.png"),
  "Far Throw": require("../../assets/playstyles/silver/far-throw.png"),
  Footwork: require("../../assets/playstyles/silver/footwork.png"),
  "Cross Claimer": require("../../assets/playstyles/silver/cross-claimer.png"),
  "Rush Out": require("../../assets/playstyles/silver/rush-out.png"),
  "Far Reach": require("../../assets/playstyles/silver/far-reach.png"),
  Deflector: require("../../assets/playstyles/silver/deflector.png"),
};

/** Bronze copies, made by scripts/recolor-playstyles.js. */
const BRONZE_ICONS: Record<string, ImageSourcePropType> = {
  Finesse: require("../../assets/playstyles/bronze/finesse.png"),
  "Power Shot": require("../../assets/playstyles/bronze/power-shot.png"),
  "Chip Shot": require("../../assets/playstyles/bronze/chip-shot.png"),
  "Dead Ball": require("../../assets/playstyles/bronze/dead-ball.png"),
  "Low Driven": require("../../assets/playstyles/bronze/low-driven.png"),
  "Precision Header": require("../../assets/playstyles/bronze/precision-header.png"),
  Gamechanger: require("../../assets/playstyles/bronze/gamechanger.png"),
  Acrobatic: require("../../assets/playstyles/bronze/acrobatic.png"),
  Incisive: require("../../assets/playstyles/bronze/incisive.png"),
  "Pinged Pass": require("../../assets/playstyles/bronze/pinged-pass.png"),
  "Long Ball": require("../../assets/playstyles/bronze/long-ball.png"),
  "Tiki Taka": require("../../assets/playstyles/bronze/tiki-taka.png"),
  "Whipped Pass": require("../../assets/playstyles/bronze/whipped-pass.png"),
  Inventive: require("../../assets/playstyles/bronze/inventive.png"),
  "First Touch": require("../../assets/playstyles/bronze/first-touch.png"),
  "Press Proven": require("../../assets/playstyles/bronze/press-proven.png"),
  Rapid: require("../../assets/playstyles/bronze/rapid.png"),
  Technical: require("../../assets/playstyles/bronze/technical.png"),
  Trickster: require("../../assets/playstyles/bronze/trickster.png"),
  "Aerial Fortress": require("../../assets/playstyles/bronze/aerial-fortress.png"),
  Block: require("../../assets/playstyles/bronze/block.png"),
  Intercept: require("../../assets/playstyles/bronze/intercept.png"),
  Jockey: require("../../assets/playstyles/bronze/jockey.png"),
  "Slide Tackle": require("../../assets/playstyles/bronze/slide-tackle.png"),
  Anticipate: require("../../assets/playstyles/bronze/anticipate.png"),
  Bruiser: require("../../assets/playstyles/bronze/bruiser.png"),
  Enforcer: require("../../assets/playstyles/bronze/enforcer.png"),
  "Quick Step": require("../../assets/playstyles/bronze/quick-step.png"),
  Relentless: require("../../assets/playstyles/bronze/relentless.png"),
  "Long Throw": require("../../assets/playstyles/bronze/long-throw.png"),
  "Far Throw": require("../../assets/playstyles/bronze/far-throw.png"),
  Footwork: require("../../assets/playstyles/bronze/footwork.png"),
  "Cross Claimer": require("../../assets/playstyles/bronze/cross-claimer.png"),
  "Rush Out": require("../../assets/playstyles/bronze/rush-out.png"),
  "Far Reach": require("../../assets/playstyles/bronze/far-reach.png"),
  Deflector: require("../../assets/playstyles/bronze/deflector.png"),
};

/** Every badge in every tier, for preloading. */
export const ALL_ICON_IMAGES: ImageSourcePropType[] = [
  ...Object.values(ICON_IMAGES),
  ...Object.values(SILVER_ICONS),
  ...Object.values(BRONZE_ICONS),
];

/** The badge for a PlayStyle+, coloured to match a gold, silver or bronze card. */
export function getPlaystyleIcon(
  name: string,
  tier: CardTier = "gold",
): ImageSourcePropType | undefined {
  const set =
    tier === "silver" ? SILVER_ICONS : tier === "bronze" ? BRONZE_ICONS : ICON_IMAGES;
  return set[name] ?? ICON_IMAGES[name];
}
