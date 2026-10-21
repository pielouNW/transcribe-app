import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  getModelStatus,
  loadModel,
  subscribeModelStatus,
  type ModelStatus,
} from '../lib/stt';
import { colors } from '../theme';

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus>(getModelStatus);
  useEffect(() => subscribeModelStatus(setStatus), []);
  return status;
}

export function ModelStatusBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const status = useModelStatus();

  if (status.state === 'ready' || status.state === 'idle') {
    return null;
  }

  if (status.state === 'downloading' || status.state === 'loading') {
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

  return (
    <Pressable
      style={[styles.bannerContainer, styles.errorContainer, style]}
      onPress={() => loadModel().catch(() => {})}
    >
      <Text style={styles.text}>
        Model failed to load: {status.message}. Tap to retry.
      </Text>
    </Pressable>
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
    backgroundColor: '#E9EEFF',
  },
  errorContainer: {
    backgroundColor: '#FDE8E8',
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
});
