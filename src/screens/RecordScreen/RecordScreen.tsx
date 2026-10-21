import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  type AudioStreamBuffer,
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModelStatusBanner } from '../../components/ModelStatusBanner';
import { normalizeWavFile } from '../../lib/audioFile';
import { Chunker, type AudioChunk } from '../../lib/chunker';
import {
  audioFileFor,
  formatTime,
  type TranscriptChunk,
} from '../../lib/storage';
import { loadModel, transcribeChunk } from '../../lib/stt';
import type { RootScreenProps } from '../../navigation/types';
import { useRecordings } from '../../state/RecordingsContext';
import { colors } from '../../theme';
import { styles } from './RecordScreen.style';

const SAMPLE_RATE = 16000;
const KEEP_AWAKE_TAG = 'recording';

type Phase = 'idle' | 'recording' | 'finishing';
type LiveChunk = Omit<TranscriptChunk, 'text'> & { text: string | null };

function toMonoInt16(buffer: AudioStreamBuffer) {
  const raw = new Int16Array(buffer.data);
  if (buffer.channels <= 1) {
    return raw;
  }
  const frames = Math.floor(raw.length / buffer.channels);
  const mono = new Int16Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < buffer.channels; c++) {
      sum += raw[i * buffer.channels + c];
    }
    mono[i] = sum / buffer.channels;
  }
  return mono;
}

export function RecordScreen({ navigation }: RootScreenProps<'Record'>) {
  const { upsertRecording } = useRecordings();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [chunks, setChunks] = useState<LiveChunk[]>([]);

  const idRef = useRef('');
  const chunkerRef = useRef<Chunker | null>(null);
  const pendingRef = useRef<Promise<void>[]>([]);
  const chunksRef = useRef<LiveChunk[]>([]);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const onChunk = (chunk: AudioChunk) => {
    const index = chunksRef.current.length;
    const live: LiveChunk = { start: chunk.start, end: chunk.end, text: null };
    chunksRef.current = [...chunksRef.current, live];
    setChunks(chunksRef.current);

    const job = transcribeChunk(chunk)
      .catch(e => {
        console.warn('Transcription failed', e);
        return '[transcription failed]';
      })
      .then(text => {
        chunksRef.current = chunksRef.current.map((c, i) =>
          i === index ? { ...c, text } : c,
        );

        setChunks(chunksRef.current);
      });
    pendingRef.current.push(job);
  };

  const { stream } = useAudioStream({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: buffer => {
      if (phaseRef.current !== 'recording') {
        return;
      }

      if (!chunkerRef.current) {
        chunkerRef.current = new Chunker(buffer.sampleRate, onChunk);
      }

      chunkerRef.current.push(toMonoInt16(buffer));
      setElapsed(Math.floor(chunkerRef.current.duration));
    },
  });

  useEffect(() => {
    loadModel().catch(() => {});
  }, []);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (phaseRef.current === 'idle') {
          return;
        }

        e.preventDefault();

        Alert.alert('Discard recording?', 'The recording will be lost.', [
          { text: 'Keep recording', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              phaseRef.current = 'idle';
              stream.stop();
              deactivateKeepAwake(KEEP_AWAKE_TAG);
              const file = audioFileFor(idRef.current);
              if (file.exists) {
                file.delete();
              }
              navigation.dispatch(e.data.action);
            },
          },
        ]);
      }),
    [navigation, stream],
  );

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Microphone access needed',
        'Enable microphone access in Settings to record.',
      );
      return;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      allowsBackgroundRecording: true,
      shouldPlayInBackground: true,
    });

    idRef.current = Date.now().toString(36);
    chunkerRef.current = null;
    chunksRef.current = [];
    pendingRef.current = [];
    setChunks([]);
    setElapsed(0);

    try {
      await stream.start();
      await stream.startFileRecordingAsync({
        uri: audioFileFor(idRef.current).uri,
        format: 'wav',
      });
    } catch (e: any) {
      stream.stop();
      Alert.alert('Could not start recording', String(e?.message ?? e));
      return;
    }

    phaseRef.current = 'recording';
    setPhase('recording');
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
  };

  const stop = async () => {
    setPhase('finishing');
    phaseRef.current = 'finishing';

    let duration = elapsed;
    try {
      const result = await stream.stopFileRecordingAsync();
      duration = result.duration;
    } catch (e) {
      console.warn('Failed to finalize recording file', e);
    }

    stream.stop();
    chunkerRef.current?.flush();

    // Wait for every queued chunk (including ones added by flush).
    while (pendingRef.current.length) {
      const jobs = pendingRef.current;
      pendingRef.current = [];

      await Promise.all(jobs);
    }

    deactivateKeepAwake(KEEP_AWAKE_TAG);

    if (!chunksRef.current.some(c => c.text)) {
      const file = audioFileFor(idRef.current);

      if (file.exists) {
        file.delete();
      }

      chunksRef.current = [];
      setChunks([]);
      setElapsed(0);
      setPhase('idle');
      phaseRef.current = 'idle';

      Alert.alert(
        'No speech detected',
        'Nothing was saved. Try recording again closer to the speaker.',
      );
      return;
    }

    try {
      await normalizeWavFile(audioFileFor(idRef.current));
    } catch (e) {
      console.warn('Failed to normalize recording volume', e);
    }

    const createdAt = Date.now();

    upsertRecording({
      id: idRef.current,
      title: `Recording ${new Date(createdAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}`,
      createdAt,
      duration,
      chunks: chunksRef.current.map(c => ({ ...c, text: c.text ?? '' })),
    });
    setPhase('idle');

    phaseRef.current = 'idle';
    navigation.replace('Transcript', { id: idRef.current });
  };

  const pendingCount = chunks.filter(c => c.text === null).length;

  return (
    <View style={styles.screenContainer}>
      <ModelStatusBanner />
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerHint}>
          {phase === 'idle'
            ? 'Tap record to start'
            : phase === 'recording'
            ? 'Recording · transcribing as you go'
            : `Finishing transcription${
                pendingCount ? ` (${pendingCount} left)` : ''
              }…`}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.liveContainer}
        contentContainerStyle={styles.liveContentContainer}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
      >
        {chunks.map((c, i) => (
          <View key={i} style={styles.chunkContainer}>
            <Text style={styles.chunkTime}>{formatTime(c.start)}</Text>
            {c.text === null ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Text style={styles.chunkText}>{c.text || '…'}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.controlsContainer,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {phase === 'finishing' ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Pressable
            accessibilityLabel={phase === 'recording' ? 'Stop' : 'Record'}
            onPress={phase === 'recording' ? stop : start}
            style={({ pressed }) => [
              styles.recordOuterContainer,
              pressed && styles.pressedContainer,
            ]}
          >
            <View
              style={
                phase === 'recording'
                  ? styles.stopInnerContainer
                  : styles.recordInnerContainer
              }
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
