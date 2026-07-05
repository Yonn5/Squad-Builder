import type { ImageSourcePropType } from "react-native";

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

export function getPlaystyleIcon(name: string): ImageSourcePropType | undefined {
  return ICON_IMAGES[name];
}
