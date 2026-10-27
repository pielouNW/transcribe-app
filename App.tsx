import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isModelDownloaded, loadModel } from './src/lib/stt';
import type { RootStackParamList } from './src/navigation/types';
import { HomeScreen } from './src/screens/HomeScreen/HomeScreen';
import { RecordScreen } from './src/screens/RecordScreen/RecordScreen';
import { TranscriptScreen } from './src/screens/TranscriptScreen/TranscriptScreen';
import { RecordingsProvider } from './src/state/RecordingsContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  useEffect(() => {
    if (isModelDownloaded()) {
      loadModel().catch(() => {});
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <RecordingsProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Transcriber', headerLargeTitle: true }}
            />
            <Stack.Screen
              name="Record"
              component={RecordScreen}
              options={{
                title: 'New recording',
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen
              name="Transcript"
              component={TranscriptScreen}
              options={{
                title: 'Transcript',
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </RecordingsProvider>
    </SafeAreaProvider>
  );
}

export default App;
