import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function StatSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
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
  label: {
    color: colors.textMuted,
    width: 38,
    fontWeight: "700",
    fontSize: 13,
  },
  slider: { flex: 1, height: 36 },
  value: {
    color: colors.text,
    width: 30,
    textAlign: "right",
    fontWeight: "800",
    fontSize: 15,
  },
});
