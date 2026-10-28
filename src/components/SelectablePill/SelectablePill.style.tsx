import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  pillContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedContainer: {
    borderColor: 'transparent',
    backgroundColor: colors.ctaSurfacePrimary,
  },
  pressedContainer: {
    opacity: 0.7,
  },
  label: {
    fontSize: 15,
    color: colors.text,
  },
  selectedLabel: {
    color: colors.ctaContentPrimary,
  },
});
