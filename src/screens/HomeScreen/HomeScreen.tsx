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
import type { RootScreenProps } from '../../navigation/types';
import { useRecordings } from '../../state/RecordingsContext';
import { styles } from './HomeScreen.style';

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const { recordings, removeRecording } = useRecordings();
  const insets = useSafeAreaInsets();
  const modelState = useModelStatus().state;
  const modelLoading =
    modelState === 'idle' ||
    modelState === 'downloading' ||
    modelState === 'loading';

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
          <ModelStatusBanner style={styles.bannerInListContainer} />
        }
        keyExtractor={r => r.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptyText}>
              Your conversations will apear here. Everything runs locally.
            </Text>
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
        <Pressable
          disabled={modelLoading}
          accessibilityState={{ disabled: modelLoading }}
          style={({ pressed }) => [
            styles.recordButtonContainer,
            modelLoading && styles.disabledContainer,
            pressed && styles.pressedContainer,
          ]}
          onPress={() => navigation.navigate('Record')}
        >
          {modelLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.recordDotContainer} />
          )}
          <Text style={styles.recordButtonText}>
            {modelState === 'downloading'
              ? 'Downloading model…'
              : modelLoading
              ? 'Loading model…'
              : 'New recording'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
