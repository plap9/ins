import "nativewind/tailwind.css";
import { GiphySDK } from '@giphy/react-native-sdk';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

const giphyApiKey = 'AR6domlP8YPIc57LIp0egJfMvV293kCSt'
GiphySDK.configure({ apiKey: giphyApiKey });

export default function App() {
  return (
    <View style={styles.container}>
      <Text>hihihi!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});