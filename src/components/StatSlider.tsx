import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function StatSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  /** Spelled-out stat name, e.g. "Reflexes" for REF. */
  hint?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={99}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
      />
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  labelWrap: { width: 64 },
  label: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  hint: { color: colors.textMuted, fontSize: 9, opacity: 0.7 },
  slider: { flex: 1, height: 36 },
  value: {
    color: colors.text,
    width: 30,
    textAlign: "right",
    fontWeight: "800",
    fontSize: 15,
  },
});
