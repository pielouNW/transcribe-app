import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  deleteRecordingFiles,
  loadRecordings,
  saveRecordings,
  type Recording,
} from '../lib/storage';

type RecordingsContextValue = {
  recordings: Recording[];
  upsertRecording: (recording: Recording) => void;
  removeRecording: (id: string) => void;
};

const RecordingsContext = createContext<RecordingsContextValue | null>(null);

export function RecordingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recordings, setRecordings] = useState<Recording[]>(loadRecordings);

  const update = useCallback((fn: (prev: Recording[]) => Recording[]) => {
    setRecordings(prev => {
      const next = fn(prev);
      saveRecordings(next);
      return next;
    });
  }, []);

  const upsertRecording = useCallback(
    (recording: Recording) =>
      update(prev => {
        const exists = prev.some(r => r.id === recording.id);
        return exists
          ? prev.map(r => (r.id === recording.id ? recording : r))
          : [recording, ...prev];
      }),
    [update],
  );

  const removeRecording = useCallback(
    (id: string) =>
      update(prev => {
        const target = prev.find(r => r.id === id);
        if (target) {
          deleteRecordingFiles(target);
        }
        return prev.filter(r => r.id !== id);
      }),
    [update],
  );

  const value = useMemo(
    () => ({ recordings, upsertRecording, removeRecording }),
    [recordings, upsertRecording, removeRecording],
  );

  return (
    <RecordingsContext.Provider value={value}>
      {children}
    </RecordingsContext.Provider>
  );
}

export function useRecordings() {
  const ctx = useContext(RecordingsContext);
  if (!ctx) {
    throw new Error('useRecordings must be used inside RecordingsProvider');
  }
  return ctx;
}

export function useRecording(id: string) {
  return useRecordings().recordings.find(r => r.id === id);
}
