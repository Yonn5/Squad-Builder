import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  MAX_PLAYSTYLES,
  PLAYSTYLES_BY_CATEGORY,
  PLAYSTYLE_CATEGORIES,
} from "../constants/playstyles";
import { categoryColors, colors } from "../theme";
import { PlaystyleBadge } from "./PlaystyleBadge";

/**
 * Category-grouped PlayStyle+ selector; enforces the 4-style cap.
 */
export function PlaystylePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else if (selected.length < MAX_PLAYSTYLES) {
      onChange([...selected, name]);
    }
  };

  const full = selected.length >= MAX_PLAYSTYLES;

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.counter}>
        {selected.length}/{MAX_PLAYSTYLES} selected
      </Text>
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
                  <PlaystyleBadge name={style.name} size={22} />
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
  counter: { color: colors.textMuted, fontWeight: "600" },
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
