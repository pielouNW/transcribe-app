import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildQuery, searchChunks, type SearchMatch } from '../../lib/search';
import {
  audioFileFor,
  formatTime,
  transcriptToText,
  type Recording,
} from '../../lib/storage';
import { encodeWav, normalize, parseWav } from '../../lib/wav';
import type { RootScreenProps } from '../../navigation/types';
import { transcribeWavFile } from '../../lib/transcribe';
import { useRecording, useRecordings } from '../../state/RecordingsContext';
import { colors } from '../../theme';
import { styles } from './TranscriptScreen.style';

function safeFileName(name: string) {
  return name
    .replace(/[^a-z0-9-_ ]/gi, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function shareFile(file: File, mimeType: string, UTI: string) {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing is not available on this device');
    return;
  }
  await Sharing.shareAsync(file.uri, { mimeType, UTI });
}

async function shareTranscript(recording: Recording) {
  const file = new File(Paths.cache, `${safeFileName(recording.title)}.txt`);
  file.create({ overwrite: true });
  file.write(transcriptToText(recording));
  await shareFile(file, 'text/plain', 'public.plain-text');
}

async function shareAudio(recording: Recording) {
  await shareFile(
    audioFileFor(recording.id),
    'audio/wav',
    'com.microsoft.waveform-audio',
  );
}

/** Crop the recording to [start, end] and share the clip as a WAV file. */
async function shareClip(recording: Recording, start: number, end: number) {
  const { samples, sampleRate } = parseWav(
    await audioFileFor(recording.id).bytes(),
  );
  const clip = samples.subarray(
    Math.floor(start * sampleRate),
    Math.ceil(end * sampleRate),
  );
  // Recordings made before normalization was added are still quiet.
  normalize(clip);
  const file = new File(
    Paths.cache,
    `${safeFileName(recording.title)}-${formatTime(start).replace(
      /:/g,
      '-',
    )}.wav`,
  );
  file.create({ overwrite: true });
  file.write(encodeWav(clip, sampleRate));
  await shareFile(file, 'audio/wav', 'com.microsoft.waveform-audio');
}

function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s > cursor) {
      parts.push(text.slice(cursor, s));
    }
    parts.push(
      <Text key={i} style={styles.highlight}>
        {text.slice(s, e)}
      </Text>,
    );
    cursor = e;
  });
  parts.push(text.slice(cursor));
  return <Text style={styles.chunkText}>{parts}</Text>;
}

function ExportHeaderButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Export"
    >
      <Ionicons name="share-outline" size={24} color={colors.primary} />
    </Pressable>
  );
}

type MenuItem = { label: string; action: () => Promise<unknown> };

/** Native action sheet on iOS, alert with buttons on Android. */
function showMenu(title: string, items: MenuItem[]) {
  const run = (item?: MenuItem) =>
    item?.action().catch(e => Alert.alert('Failed', String(e?.message ?? e)));

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...items.map(i => i.label), 'Cancel'],
        cancelButtonIndex: items.length,
      },
      index => run(items[index]),
    );
  } else {
    Alert.alert(title, undefined, [
      ...items.map(item => ({ text: item.label, onPress: () => run(item) })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

const renderExportHeaderButton = (onPress: () => void) => () =>
  <ExportHeaderButton onPress={onPress} />;

export function TranscriptScreen({
  navigation,
  route,
}: RootScreenProps<'Transcript'>) {
  const recording = useRecording(route.params.id);
  const { upsertRecording } = useRecordings();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const player = useAudioPlayer(
    recording ? audioFileFor(recording.id).uri : null,
  );
  const playerStatus = useAudioPlayerStatus(player);

  const regex = useMemo(() => buildQuery(query), [query]);
  const results: SearchMatch[] = useMemo(() => {
    const chunks = recording?.chunks ?? [];
    if (!regex) {
      return chunks
        .map((chunk, chunkIndex) => ({ chunk, chunkIndex, ranges: [] }))
        .filter(m => m.chunk.text);
    }
    return searchChunks(chunks, regex);
  }, [recording, regex]);
  const matchCount = results.reduce((n, r) => n + r.ranges.length, 0);

  useLayoutEffect(() => {
    if (!recording) {
      return;
    }
    const retranscribe = async () => {
      setProgress('Re-transcribing…');
      try {
        const chunks = await transcribeWavFile(
          audioFileFor(recording.id).uri,
          (done, total) => setProgress(`Re-transcribing… ${done}/${total}`),
        );
        upsertRecording({ ...recording, chunks });
      } finally {
        setProgress(null);
      }
    };
    const openMenu = () =>
      showMenu('Transcript', [
        {
          label: 'Share transcript (.txt)',
          action: () => shareTranscript(recording),
        },
        {
          label: 'Share full audio (.wav)',
          action: () => shareAudio(recording),
        },
        { label: 'Re-transcribe', action: retranscribe },
      ]);
    navigation.setOptions({
      headerRight: renderExportHeaderButton(openMenu),
    });
  }, [navigation, recording, upsertRecording]);

  if (!recording) {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.empty}>Recording not found.</Text>
      </View>
    );
  }

  const playFrom = async (seconds: number) => {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    await player.seekTo(seconds);
    player.play();
  };

  const onClip = (match: SearchMatch) =>
    showMenu(
      `${formatTime(match.chunk.start)} – ${formatTime(match.chunk.end)}`,
      [
        {
          label: 'Share audio clip (.wav)',
          action: () =>
            shareClip(recording, match.chunk.start, match.chunk.end),
        },
        {
          label: 'Copy text',
          action: async () => {
            await Clipboard.setStringAsync(match.chunk.text);
            if (Platform.OS === 'ios') {
              Alert.alert('Copied to clipboard');
            }
          },
        },
      ],
    );

  return (
    <View style={styles.screenContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {progress && <Text style={styles.resultCount}>{progress}</Text>}
        {regex && (
          <Text style={styles.resultCount}>
            {matchCount} match{matchCount === 1 ? '' : 'es'} in {results.length}{' '}
            segment{results.length === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={r => String(r.chunkIndex)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {regex ? 'Nothing matches that search.' : 'No speech detected.'}
          </Text>
        }
        renderItem={({ item }) => {
          const active =
            playerStatus.playing &&
            playerStatus.currentTime >= item.chunk.start &&
            playerStatus.currentTime < item.chunk.end;
          return (
            <Pressable
              onPress={() => playFrom(item.chunk.start)}
              style={({ pressed }) => [
                styles.chunkContainer,
                active && styles.activeChunkContainer,
                pressed && styles.pressedContainer,
              ]}
            >
              <View style={styles.chunkHeaderContainer}>
                <Text style={styles.chunkTime}>
                  ▶ {formatTime(item.chunk.start)} –{' '}
                  {formatTime(item.chunk.end)}
                </Text>
                <Pressable onPress={() => onClip(item)} hitSlop={8}>
                  <Text style={styles.clipButton}>Share clip</Text>
                </Pressable>
              </View>
              <HighlightedText text={item.chunk.text} ranges={item.ranges} />
            </Pressable>
          );
        }}
      />

      {playerStatus.playing && (
        <View
          style={[
            styles.playerContainer,
            { paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Text style={styles.playerTime}>
            {formatTime(playerStatus.currentTime)} /{' '}
            {formatTime(recording.duration)}
          </Text>
          <Pressable onPress={() => player.pause()} hitSlop={10}>
            <Text style={styles.headerButton}>Stop</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
