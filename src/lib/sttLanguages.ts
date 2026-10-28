// ISO 639-1 code
export const WHISPER_LANGUAGES: Record<string, string> = {
  English: 'en',
  Chinese: 'zh',
  German: 'de',
  Spanish: 'es',
  Russian: 'ru',
  French: 'fr',
  Japanese: 'ja',
  Portuguese: 'pt',
  Turkish: 'tr',
  Polish: 'pl',
  Dutch: 'nl',
  Arabic: 'ar',
  Swedish: 'sv',
  Italian: 'it',
  Indonesian: 'id',
  Hindi: 'hi',
  Finnish: 'fi',
  Ukrainian: 'uk',
  Greek: 'el',
  Czech: 'cs',
  Romanian: 'ro',
  Danish: 'da',
  Hungarian: 'hu',
  Norwegian: 'no',
  Croatian: 'hr',
  Bulgarian: 'bg',
  Lithuanian: 'lt',
  Slovak: 'sk',
  Latvian: 'lv',
  Bengali: 'bn',
  Serbian: 'sr',
  Slovenian: 'sl',
  Estonian: 'et',
  Macedonian: 'mk',
  Icelandic: 'is',
  Bosnian: 'bs',
  Albanian: 'sq',
  Belarusian: 'be',
};

export interface SttLanguageOption {
  name: string;
  // Undefined is the automatic entry: the engine detects the spoken language
  // itself, at the cost of a detection pass on every transcription.
  code?: string;
}

// The offered languages, in table order. Kept as a module constant rather than
// rebuilt per render: the list is fixed and a hundred entries long.
export const STT_LANGUAGE_OPTIONS: readonly SttLanguageOption[] =
  Object.entries(WHISPER_LANGUAGES).map(([name, code]) => ({ name, code }));
