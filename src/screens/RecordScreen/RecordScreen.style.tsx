import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  timer: {
    fontSize: 56,
    fontWeight: '200',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
  },
  liveContainer: {
    flex: 1,
  },
  liveContentContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chunkContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  chunkTime: {
    width: 48,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontSize: 13,
    paddingTop: 2,
  },
  chunkText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  controlsContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  recordOuterContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedContainer: {
    opacity: 0.7,
  },
  recordInnerContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.danger,
  },
  stopInnerContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
});
