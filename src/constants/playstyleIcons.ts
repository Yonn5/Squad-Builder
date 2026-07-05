import type { ImageSourcePropType } from "react-native";

/**
 * PlayStyle name -> icon image.
 *
 * The PNGs in assets/playstyles/ are generated placeholders
 * (npm run icons:placeholders). Drop your own icon PNGs into that folder
 * using the same filenames and they'll show up everywhere automatically —
 * this dict is the single source of truth for icon lookups.
 */
export const ICON_IMAGES: Record<string, ImageSourcePropType> = {
  // Scoring
  "Finesse Shot": require("../../assets/playstyles/finesse-shot.png"),
  "Power Shot": require("../../assets/playstyles/power-shot.png"),
  "Chip Shot": require("../../assets/playstyles/chip-shot.png"),
  "Power Header": require("../../assets/playstyles/power-header.png"),
  Trivela: require("../../assets/playstyles/trivela.png"),
  // Passing
  "Incisive Pass": require("../../assets/playstyles/incisive-pass.png"),
  "Pinged Pass": require("../../assets/playstyles/pinged-pass.png"),
  "Long Ball Pass": require("../../assets/playstyles/long-ball-pass.png"),
  "Tiki Taka": require("../../assets/playstyles/tiki-taka.png"),
  "Whipped Pass": require("../../assets/playstyles/whipped-pass.png"),
  // Ball Control
  "First Touch": require("../../assets/playstyles/first-touch.png"),
  Flair: require("../../assets/playstyles/flair.png"),
  "Press Proven": require("../../assets/playstyles/press-proven.png"),
  Rapid: require("../../assets/playstyles/rapid.png"),
  Technical: require("../../assets/playstyles/technical.png"),
  Trickster: require("../../assets/playstyles/trickster.png"),
  // Defending
  Block: require("../../assets/playstyles/block.png"),
  Bruiser: require("../../assets/playstyles/bruiser.png"),
  Intercept: require("../../assets/playstyles/intercept.png"),
  Jockey: require("../../assets/playstyles/jockey.png"),
  "Slide Tackle": require("../../assets/playstyles/slide-tackle.png"),
  Anticipate: require("../../assets/playstyles/anticipate.png"),
  // Physical
  Acrobatic: require("../../assets/playstyles/acrobatic.png"),
  Aerial: require("../../assets/playstyles/aerial.png"),
  "Quick Step": require("../../assets/playstyles/quick-step.png"),
  Relentless: require("../../assets/playstyles/relentless.png"),
  "Long Throw": require("../../assets/playstyles/long-throw.png"),
  // Goalkeeper
  "Far Throw": require("../../assets/playstyles/far-throw.png"),
  Footwork: require("../../assets/playstyles/footwork.png"),
  "Cross Claimer": require("../../assets/playstyles/cross-claimer.png"),
  "Rush Out": require("../../assets/playstyles/rush-out.png"),
  "Far Reach": require("../../assets/playstyles/far-reach.png"),
};

export function getPlaystyleIcon(name: string): ImageSourcePropType | undefined {
  return ICON_IMAGES[name];
}
