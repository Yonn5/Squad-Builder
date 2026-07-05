export const PLAYSTYLE_CATEGORIES = [
  "Scoring",
  "Passing",
  "Ball Control",
  "Defending",
  "Physical",
  "Goalkeeper",
] as const;

export type PlaystyleCategory = (typeof PLAYSTYLE_CATEGORIES)[number];

export type Playstyle = {
  name: string;
  category: PlaystyleCategory;
  description: string;
};

export const MAX_PLAYSTYLES = 4;

/** 36 PlayStyles+ across 6 categories (matches the icon set in assets/playstyles). */
export const PLAYSTYLES: Playstyle[] = [
  // Scoring
  { name: "Finesse", category: "Scoring", description: "Curls placed shots into the corners" },
  { name: "Power Shot", category: "Scoring", description: "Unleashes thunderous strikes from range" },
  { name: "Chip Shot", category: "Scoring", description: "Lobs the keeper with delicate dinks" },
  { name: "Dead Ball", category: "Scoring", description: "Free kicks and penalties are as good as goals" },
  { name: "Low Driven", category: "Scoring", description: "Hard, low finishes across the keeper" },
  { name: "Precision Header", category: "Scoring", description: "Pinpoint headers from crosses and corners" },
  { name: "Gamechanger", category: "Scoring", description: "Delivers when it matters most" },
  { name: "Acrobatic", category: "Scoring", description: "Volleys, scissors and overheads" },
  // Passing
  { name: "Incisive", category: "Passing", description: "Threads defence-splitting through balls" },
  { name: "Pinged Pass", category: "Passing", description: "Drives fast, flat passes into feet" },
  { name: "Long Ball", category: "Passing", description: "Switches play with raking long balls" },
  { name: "Tiki Taka", category: "Passing", description: "Keeps it moving with crisp one-twos" },
  { name: "Whipped Pass", category: "Passing", description: "Whips wicked crosses into the box" },
  { name: "Inventive", category: "Passing", description: "Sees passes nobody else does" },
  // Ball Control
  { name: "First Touch", category: "Ball Control", description: "Kills any ball dead instantly" },
  { name: "Press Proven", category: "Ball Control", description: "Shields the ball under pressure" },
  { name: "Rapid", category: "Ball Control", description: "Keeps close control at full sprint" },
  { name: "Technical", category: "Ball Control", description: "Glides past players with elastic dribbling" },
  { name: "Trickster", category: "Ball Control", description: "Skill moves for days" },
  // Defending
  { name: "Aerial Fortress", category: "Defending", description: "Owns the airspace in both boxes" },
  { name: "Block", category: "Defending", description: "Throws the body in front of everything" },
  { name: "Intercept", category: "Defending", description: "Reads passes before they happen" },
  { name: "Jockey", category: "Defending", description: "Contains attackers with patient defending" },
  { name: "Slide Tackle", category: "Defending", description: "Perfectly timed last-ditch slides" },
  { name: "Anticipate", category: "Defending", description: "Always a step ahead in the duel" },
  // Physical
  { name: "Bruiser", category: "Physical", description: "Wins the ball with pure muscle" },
  { name: "Enforcer", category: "Physical", description: "Imposes themselves on every duel" },
  { name: "Quick Step", category: "Physical", description: "Explosive off the mark" },
  { name: "Relentless", category: "Physical", description: "Runs all day, every day" },
  { name: "Long Throw", category: "Physical", description: "Throw-ins like corner kicks" },
  // Goalkeeper
  { name: "Far Throw", category: "Goalkeeper", description: "Launches counters with long throws" },
  { name: "Footwork", category: "Goalkeeper", description: "Comfortable playing out from the back" },
  { name: "Cross Claimer", category: "Goalkeeper", description: "Commands the box on crosses" },
  { name: "Rush Out", category: "Goalkeeper", description: "Sweeps up behind the defence" },
  { name: "Far Reach", category: "Goalkeeper", description: "Fingertip saves from distance" },
  { name: "Deflector", category: "Goalkeeper", description: "Parries shots away from danger" },
];

export const PLAYSTYLES_BY_CATEGORY: Record<PlaystyleCategory, Playstyle[]> =
  PLAYSTYLE_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = PLAYSTYLES.filter((p) => p.category === cat);
      return acc;
    },
    {} as Record<PlaystyleCategory, Playstyle[]>,
  );

export function playstyleCategory(name: string): PlaystyleCategory | undefined {
  return PLAYSTYLES.find((p) => p.name === name)?.category;
}
