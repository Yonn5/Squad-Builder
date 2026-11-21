import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  PLAYSTYLES_BY_CATEGORY,
  PLAYSTYLE_CATEGORIES,
  limitHolder,
  nextLimitHint,
  playstyleCount,
  playstyleLimit,
} from "../constants/playstyles";
import type { CardTier } from "../logic/overall";
import { categoryColors, colors } from "../theme";
import { PlaystyleBadge } from "./PlaystyleBadge";

/**
 * Category-grouped PlayStyle+ selector. How many can be picked depends on
 * the card's rating: bronze 1, silver 2, gold 3, 90+ all four.
 */
export function PlaystylePicker({
  selected,
  onChange,
  tier = "gold",
  overall,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  /** The card's rating, which sets how many can be picked. */
  overall: number;
  /** Colour the badges like the card they will sit on. */
  tier?: CardTier;
}) {
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else if (selected.length < limit) {
      onChange([...selected, name]);
    }
  };

  const limit = playstyleLimit(overall);
  const full = selected.length >= limit;
  const over = selected.length - limit;
  const holder = limitHolder(overall);
  const hint = nextLimitHint(overall);

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.counter} testID="playstyle-counter">
        {selected.length}/{limit} selected · {holder} hold{" "}
        {playstyleCount(limit)}.{hint ? ` ${hint}` : ""}
      </Text>
      {over > 0 ? (
        <Text style={styles.over}>
          At {overall} your card holds {playstyleCount(limit)}. Remove {over}{" "}
          to save.
        </Text>
      ) : null}
      {PLAYSTYLE_CATEGORIES.map((category) => (
        <View key={category}>
          <Text style={[styles.category, { color: categoryColors[category] }]}>
            {category}
          </Text>
          <View style={styles.chips}>
            {PLAYSTYLES_BY_CATEGORY[category].map((style) => {
              const isSelected = selected.includes(style.name);
              const disabled = !isSelected && full;
              return (
                <TouchableOpacity
                  key={style.name}
                  onPress={() => toggle(style.name)}
                  disabled={disabled}
                  style={[
                    styles.chip,
                    isSelected && {
                      borderColor: categoryColors[category],
                      backgroundColor: colors.surfaceAlt,
                    },
                    disabled && { opacity: 0.35 },
                  ]}
                >
                  <PlaystyleBadge name={style.name} size={22} tier={tier} />
                  <Text style={styles.chipText}>{style.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { color: colors.textMuted, fontWeight: "600", lineHeight: 19 },
  over: { color: colors.danger, fontWeight: "700", lineHeight: 19 },
  category: {
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
