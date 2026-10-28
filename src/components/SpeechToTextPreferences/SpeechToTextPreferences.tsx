import React from 'react';
import { Text, View } from 'react-native';
import { STT_LANGUAGE_OPTIONS } from '../../lib/sttLanguages';
import { SelectablePill } from '../SelectablePill/SelectablePill';
import { styles } from './SpeechToTextPreferences.style';

export function SpeechToTextPreferences({
  language,
  onChange,
}: {
  language: string | null;
  onChange: (language: string | null) => void;
}) {
  return (
    <View style={styles.blockContainer}>
      <Text style={styles.sectionHeader}>Language</Text>
      <Text style={styles.subtitle}>
        The language you speak. Picking one skips detection and transcribes
        faster.
      </Text>
      <View style={styles.pillRowContainer}>
        <SelectablePill
          label="Automatic"
          selected={language === null}
          onPress={() => onChange(null)}
        />
        {STT_LANGUAGE_OPTIONS.map(option => (
          <SelectablePill
            key={option.code}
            label={option.name}
            selected={option.code === language}
            onPress={() => onChange(option.code ?? null)}
          />
        ))}
      </View>
    </View>
  );
}
