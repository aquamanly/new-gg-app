// --- In your actual Home.js component (Dashboard) ---

import React from 'react';
import { View, Button, Text } from 'react-native';
import { supabase } from './supabase';

export default function Home({ navigation }) {
  // Don't forget to accept navigation prop

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert('Logout failed: ' + error.message);
      return;
    }

    // Crucial step: Navigate back to the entry point,
    // which will render the SignIn component via Redirect.
    navigation.replace('Redirect');
  }
  function handlePlay() {
    navigation.replace('Play');
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Welcome to the Dashboard!</Text>
      {/* Other dashboard content */}
      <Button title="Press Play" onPress={handlePlay} />
      {/* The Logout Button */}
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
