import { File, Paths } from 'expo-file-system';

/** ISO 639-1 code passed to Whisper. Null lets Whisper detect the language. */
export type Settings = {
  sttLanguage: string | null;
};

const DEFAULT_SETTINGS: Settings = {
  sttLanguage: 'en',
};

const settingsFile = new File(Paths.document, 'settings.json');

export function loadSettings(): Settings {
  try {
    if (!settingsFile.exists) {
      return DEFAULT_SETTINGS;
    }

    return { ...DEFAULT_SETTINGS, ...JSON.parse(settingsFile.textSync()) };
  } catch (e) {
    console.warn('Failed to read settings', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<Settings>) {
  const next = { ...loadSettings(), ...patch };

  if (!settingsFile.exists) {
    settingsFile.create({ intermediates: true });
  }

  settingsFile.write(JSON.stringify(next));
  return next;
}
