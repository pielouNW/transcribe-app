import React from 'react';
import { Pressable, Text } from 'react-native';
import { styles } from './SelectablePill.style';

export function SelectablePill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.pillContainer,
        selected && styles.selectedContainer,
        pressed && styles.pressedContainer,
      ]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}
