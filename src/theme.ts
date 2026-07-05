export const colors = {
  bg: "#0e1116",
  surface: "#1a1f27",
  surfaceAlt: "#232a35",
  border: "#2e3744",
  text: "#f2f4f7",
  textMuted: "#9aa4b2",
  accent: "#3ddc84",
  accentDark: "#199e58",
  danger: "#e5484d",
  warning: "#f0b429",
  pitch: "#1e7a3c",
  pitchLine: "rgba(255,255,255,0.45)",
};

export const tierColors = {
  gold: {
    gradient: ["#f7e08a", "#d4a937", "#8a6712"],
    text: "#3d2e05",
    label: "Gold",
  },
  silver: {
    gradient: ["#e8eaee", "#adb3bd", "#6d7480"],
    text: "#23272e",
    label: "Silver",
  },
  bronze: {
    gradient: ["#d89a62", "#a06a35", "#5f3c1a"],
    text: "#2e1a08",
    label: "Bronze",
  },
} as const;

export const categoryColors: Record<string, string> = {
  Scoring: "#e74c3c",
  Passing: "#3498db",
  "Ball Control": "#9b59b6",
  Defending: "#27ae60",
  Physical: "#e67e22",
  Goalkeeper: "#f1c40f",
};
