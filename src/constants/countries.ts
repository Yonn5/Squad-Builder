export type Country = {
  name: string;
  flag: string;
};

/** Common nationalities for player cards (extend freely). */
export const COUNTRIES: Country[] = [
  { name: "Albania", flag: "🇦🇱" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Cameroon", flag: "🇨🇲" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "China", flag: "🇨🇳" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Czechia", flag: "🇨🇿" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "India", flag: "🇮🇳" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Ivory Coast", flag: "🇨🇮" },
  { name: "Jamaica", flag: "🇯🇲" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Puerto Rico", flag: "🇵🇷" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Ukraine", flag: "🇺🇦" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
];

export function flagFor(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return COUNTRIES.find((c) => c.name === name)?.flag;
}
