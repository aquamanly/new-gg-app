import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// 1. IMPORT NAVIGATION COMPONENTS
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 2. IMPORT SCREENS
import Redirect from './Redirect'; // Handles the initial Signin/Home switch
import Home from './Home';
import LogActivity from './KnockInput'; // Assuming this is the correct path/name
import Playtime from './playtime';

// 3. CREATE STACK NAVIGATOR INSTANCE
const Stack = createNativeStackNavigator();

function AppStack() {
  return (
    // Define the application's navigation flow here
    <Stack.Navigator
      initialRouteName="Redirect"
      // Optional: Set default options for all screens
      screenOptions={{
        headerStyle: { backgroundColor: '#f4511e' },
        headerTintColor: '#fff',
      }}
    >
      {/* The first screen is the entry point that decides Signin or Home. 
        We disable the header here.
      */}
      <Stack.Screen
        name="Redirect"
        component={Redirect}
        options={{ headerShown: false }}
      />

      {/* The Home screen (Dashboard)
        This is where your Home component is rendered and receives the 'navigation' prop.
      */}
      <Stack.Screen
        name="Home"
        component={Home}
        options={{ title: 'Dashboard' }}
      />

      {/* The LogActivity screen. 
        This is the target of navigation.navigate('LogActivity', ...)
      */}
      <Stack.Screen
        name="LogActivity"
        component={LogActivity}
        options={{ title: 'Log Knocks' }}
      />

      <Stack.Screen
        name="Play"
        component={Playtime}
        options={{ title: 'Play' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    // The entire app must be wrapped in NavigationContainer
    <NavigationContainer>
      <SafeAreaView style={styles.container}>
        <AppStack />
        <StatusBar style="auto" />
      </SafeAreaView>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Note: SafeAreaView handles padding for the notch, so we don't need padding here
  },
});
