import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  POSITION_GROUPS,
  POSITION_NAMES,
  POSITIONS_BY_GROUP,
  groupOf,
  type Position,
  type PositionGroup,
} from "../constants/positions";
import { colors } from "../theme";

/**
 * Two-step position picker: outfield players choose a group and then a
 * role within it. Goalkeeper has no second step — picking it selects GK
 * outright, and the card switches to goalkeeper stats.
 */
export function PositionPicker({
  value,
  onChange,
}: {
  value: Position;
  onChange: (position: Position) => void;
}) {
  const [group, setGroup] = React.useState<PositionGroup>(() => groupOf(value));

  // Follow the value when it changes from elsewhere (e.g. profile load).
  React.useEffect(() => {
    setGroup(groupOf(value));
  }, [value]);

  const selectGroup = (next: PositionGroup) => {
    setGroup(next);
    const roles = POSITIONS_BY_GROUP[next];
    // Switching to a group the current role doesn't belong to would leave
    // the card showing a stale position, so move to that group's first
    // role. Goalkeeper's only role is GK, so picking the group picks it.
    if (!roles.includes(value)) onChange(roles[0]);
  };

  const roles = POSITIONS_BY_GROUP[group];

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.row}>
        {POSITION_GROUPS.map((g) => {
          const active = group === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => selectGroup(g)}
              style={[styles.groupChip, active && styles.chipActive]}
            >
              <Text style={[styles.groupText, active && styles.textActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {roles.length > 1 && (
        <View style={styles.row}>
          {roles.map((position) => {
            const active = value === position;
            return (
              <TouchableOpacity
                key={position}
                onPress={() => onChange(position)}
                style={[styles.roleChip, active && styles.chipActive]}
              >
                <Text style={[styles.roleAbbr, active && styles.textActive]}>
                  {position}
                </Text>
                <Text style={[styles.roleName, active && styles.textActive]}>
                  {POSITION_NAMES[position]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {group === "Goalkeeper" && (
        <Text style={styles.hint}>
          Goalkeepers are rated on diving, handling, kicking, reflexes, speed
          and positioning instead of the outfield stats.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  groupChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    minWidth: 76,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: "#12291c" },
  groupText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  roleAbbr: { color: colors.textMuted, fontWeight: "800", fontSize: 14 },
  roleName: { color: colors.textMuted, fontSize: 9.5, marginTop: 1 },
  textActive: { color: colors.accent },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
