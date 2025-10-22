// --- In your actual Home.js component (Dashboard) ---

import React from 'react';
import { View, Button, Text } from 'react-native';
import { supabase } from './supabase';
import GMap from './GMap';

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
  function handleMaps() {
    // Note: use 'navigate' or 'goBack()' if you want to keep 'Play' on the stack,
    // but 'replace' is fine if you want to swap it out.
    navigation.replace('GMap');
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Welcome to the Dashboard!</Text>
      {/* Other dashboard content */}
      <Button title="Google Map" onPress={handleMaps} />
      <Button title="Press Play" onPress={handlePlay} />
      {/* The Logout Button */}
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
