// Playtime.js
import React from 'react';
import {
  View,
  Button,
  Text, // <-- Import Text to replace <h1>
} from 'react-native'; // <-- Import Button from react-native

export default function Playtime({ navigation }) {
  function handleReturn() {
    // Note: use 'navigate' or 'goBack()' if you want to keep 'Play' on the stack,
    // but 'replace' is fine if you want to swap it out.
    navigation.replace('Home');
  }
  function handleKnock() {
    // Note: use 'navigate' or 'goBack()' if you want to keep 'Play' on the stack,
    // but 'replace' is fine if you want to swap it out.
    navigation.replace('LogActivity');
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Replace the HTML <h1> with the React Native <Text> component.
        Use a style for the large heading font size.
      */}
      <Text style={{ fontSize: 32, fontWeight: 'bold' }}>
        It works better this way
      </Text>

      {/* The Button is now correctly imported */}
      <Button title="Go Back to Home" onPress={handleReturn} />
      <Button title="Log Knocks" onPress={handleKnock} />
    </View>
  );
}
