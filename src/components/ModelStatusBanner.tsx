import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  getModelStatus,
  subscribeModelStatus,
  type ModelStatus,
} from '../lib/stt';
import { colors } from '../theme';

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus>(getModelStatus);
  useEffect(() => subscribeModelStatus(setStatus), []);
  return status;
}

export function ModelStatusBanner({
  style,
  errorOnly,
}: {
  style?: StyleProp<ViewStyle>;
  errorOnly?: boolean;
}) {
  const status = useModelStatus();

  if (status.state === 'error') {
    return (
      <View style={[styles.bannerContainer, styles.errorContainer, style]}>
        <Text style={styles.text}>Model failed to load: {status.message}</Text>
      </View>
    );
  }

  if (
    errorOnly ||
    (status.state !== 'downloading' && status.state !== 'loading')
  ) {
    return null;
  }

  return (
    <View style={[styles.bannerContainer, style]}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.text}>
        {status.state === 'downloading'
          ? 'Downloading transcription model… (one time download)'
          : 'Transcription model is loading, please wait'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: colors.primaryContainer,
  },
  errorContainer: {
    backgroundColor: colors.dangerContainer,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
});
