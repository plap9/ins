import "nativewind/tailwind.css";
import "global.css";

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { AuthProvider } from './src/app/context/AuthContext';
import { WebRTCProvider } from './src/app/context/WebRTCContext';

import { RTCView } from 'react-native-webrtc';

declare global {
  interface NodeRequire {
    context: (directory: string, useSubdirectories?: boolean, regExp?: RegExp) => any;
  }
}

export default function App() {
  const ctx = require.context('./src/app');
  
  return (
    <AuthProvider>
      <WebRTCProvider>
        <ExpoRoot context={ctx} />
      </WebRTCProvider>
    </AuthProvider>
  );
}

registerRootComponent(App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});