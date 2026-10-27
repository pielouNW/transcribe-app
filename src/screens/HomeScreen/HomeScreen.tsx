import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ModelStatusBanner,
  useModelStatus,
} from '../../components/ModelStatusBanner';
import { formatTime, type Recording } from '../../lib/storage';
import {
  MODEL_DOWNLOAD_BYTES,
  cancelDownload,
  downloadModel,
  isModelDownloaded,
  type ModelStatus,
} from '../../lib/stt';
import type { RootScreenProps } from '../../navigation/types';
import { useRecordings } from '../../state/RecordingsContext';
import { colors } from '../../theme';
import { styles } from './HomeScreen.style';

const EMPTY_STATES = {
  downloadModel: {
    title: 'Download the transcription model',
    text: 'To start transcribing, you need download a model to your device once. After that, everything runs locally, even offline.',
  },
  downloading: {
    title: 'Please wait',
    text: 'The transcription model is downloading. This only happens once.',
  },
  noRecordings: {
    title: 'No recordings yet',
    text: 'Your conversations will appear here. Everything runs locally.',
  },
};

function getEmptyState(status: ModelStatus) {
  switch (status.state) {
    case 'notDownloaded':
      return EMPTY_STATES.downloadModel;
    case 'downloading':
      return EMPTY_STATES.downloading;
    case 'error':
      return isModelDownloaded()
        ? EMPTY_STATES.noRecordings
        : EMPTY_STATES.downloadModel;
    default:
      return EMPTY_STATES.noRecordings;
  }
}

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const { recordings, removeRecording } = useRecordings();
  const insets = useSafeAreaInsets();
  const modelStatus = useModelStatus();
  const modelLoading =
    modelStatus.state === 'idle' || modelStatus.state === 'loading';
  const downloadPercent =
    modelStatus.state === 'downloading'
      ? Math.floor(modelStatus.progress * 100)
      : null;
  const emptyState = getEmptyState(modelStatus);

  const footerButton = (() => {
    switch (modelStatus.state) {
      case 'notDownloaded':
        return {
          label: `Download model (${Math.round(
            MODEL_DOWNLOAD_BYTES / 1e6,
          )} MB)`,
          onPress: () => downloadModel(),
        };
      case 'downloading':
        return { label: 'Cancel', onPress: cancelDownload };
      case 'error':
        return { label: 'Try again', onPress: () => downloadModel() };
      case 'ready':
        return {
          label: 'New recording',
          onPress: () => navigation.navigate('Record'),
        };
      default:
        return { label: 'Loading model…' };
    }
  })();

  const confirmDelete = (recording: Recording) =>
    Alert.alert('Delete recording?', recording.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeRecording(recording.id),
      },
    ]);

  return (
    <View style={styles.screenContainer}>
      <FlatList
        data={recordings}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <ModelStatusBanner errorOnly style={styles.bannerInListContainer} />
        }
        keyExtractor={r => r.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptyText}>{emptyState.text}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.rowContainer,
              pressed && styles.pressedContainer,
            ]}
            onPress={() => navigation.navigate('Transcript', { id: item.id })}
            onLongPress={() => confirmDelete(item)}
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>
              {formatTime(item.duration)} ·{' '}
              {item.chunks.filter(c => c.text).length} segments
            </Text>
            <Text style={styles.rowPreview} numberOfLines={2}>
              {item.chunks
                .map(c => c.text)
                .filter(Boolean)
                .join(' ') || 'No speech detected'}
            </Text>
          </Pressable>
        )}
      />
      <View
        style={[styles.footerContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        {downloadPercent !== null && (
          <View style={styles.progressContainer}>
            <View style={styles.progressLabelContainer}>
              <Text style={styles.progressText}>Downloading model…</Text>
              <Text style={styles.progressText}>{downloadPercent}%</Text>
            </View>
            <View
              style={styles.progressTrackContainer}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: downloadPercent }}
            >
              <View
                style={[
                  styles.progressFillContainer,
                  { width: `${downloadPercent}%` },
                ]}
              />
            </View>
          </View>
        )}
        <Pressable
          disabled={modelLoading}
          accessibilityState={{ disabled: modelLoading }}
          style={({ pressed }) => [
            styles.recordButtonContainer,
            modelLoading && styles.disabledContainer,
            pressed && styles.pressedContainer,
          ]}
          onPress={footerButton.onPress}
        >
          {modelLoading ? (
            <ActivityIndicator size="small" color={colors.ctaContentPrimary} />
          ) : (
            modelStatus.state === 'ready' && (
              <View style={styles.recordDotContainer} />
            )
          )}
          <Text style={styles.recordButtonText}>{footerButton.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}
