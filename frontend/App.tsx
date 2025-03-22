import "nativewind/tailwind.css";
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Redirect } from 'expo-router';

export default function App() {
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <Redirect href="/(tabs)" />
        <StatusBar style="auto" />
      </View>
    </NavigationContainer>
  );
}