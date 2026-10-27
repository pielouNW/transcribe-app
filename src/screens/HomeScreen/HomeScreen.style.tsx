import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  bannerInListContainer: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  rowContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressedContainer: {
    opacity: 0.7,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  rowPreview: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    lineHeight: 19,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  progressContainer: {
    gap: 6,
    marginBottom: 20,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 13,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  progressTrackContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.primaryContainer,
  },
  progressFillContainer: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  recordButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.ctaSurfacePrimary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  disabledContainer: {
    backgroundColor: colors.ctaSurfacePrimaryDisabled,
  },
  recordDotContainer: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ctaContentPrimary,
  },
  recordButtonText: {
    color: colors.ctaContentPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
