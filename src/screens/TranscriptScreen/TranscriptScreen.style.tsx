import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  resultCount: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
  },
  listContainer: {
    padding: 16,
    gap: 10,
  },
  chunkContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  activeChunkContainer: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  pressedContainer: {
    opacity: 0.7,
  },
  chunkHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chunkTime: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  clipButton: {
    color: colors.muted,
    fontSize: 13,
  },
  chunkText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  highlight: {
    backgroundColor: colors.highlight,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
  },
  headerButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  playerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  playerTime: {
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
