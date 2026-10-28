import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpeechToTextPreferences } from '../../components/SpeechToTextPreferences/SpeechToTextPreferences';
import { getSttLanguage, setSttLanguage } from '../../lib/stt';
import { styles } from './SettingsScreen.style';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState(getSttLanguage);

  const changeLanguage = (next: string | null) => {
    setLanguage(next);
    setSttLanguage(next);
  };

  return (
    <ScrollView
      style={styles.screenContainer}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: insets.bottom + 16 },
      ]}
    >
      <SpeechToTextPreferences language={language} onChange={changeLanguage} />
    </ScrollView>
  );
}
