// LogActivity.js (formerly KnockInput.js)
import * as Location from 'expo-location';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
// NOTE: For real React Native location, you'd use expo-location or
// react-native-geolocation-service, NOT navigator.geolocation.
// We'll simulate loading here since the web API won't work in RN.
// import * as Location from 'expo-location'; // Example RN location import
import { supabase } from './supabase';

// Predefined activity options
const ACTIVITY_OPTIONS = [
  'Not Home',
  'Sold',
  'No Soliciting',
  'Mosquito Sale',
  'Tree and Shrub Sale',
];

// Replaced custom web MessageBox with the standard RN Alert for simplicity
// The showMessage helper will now use Alert.alert
function handleReturn() {
  // Note: use 'navigate' or 'goBack()' if you want to keep 'Play' on the stack,

  // but 'replace' is fine if you want to swap it out.

  navigation.replace('Home');
}

export default function LogActivity({ navigation, route }) {
  const { userId } = route.params || {};
  const [selectedActivity, setSelectedActivity] = useState([]);
  const [location, setLocation] = useState(null);
  //const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Fetch the session when Home mounts
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);
  function handleLogActivity() {
    if (session && session.user) {
      // Pass the user ID as a parameter when navigating!
      navigation.navigate('LogActivity', { userId: session.user.email });
    } else {
      // Handle case where session is not available
      Alert.alert('Error', 'User not logged in or session expired.');
    }
  }
  // Helper to show messages (uses RN Alert)
  const showMessage = (msg, type = 'success') => {
    // In React Native, Alert is a simple way to show messages
    Alert.alert(type === 'success' ? 'Success' : 'Error', msg);
  };

  // New handler to toggle an option in the array
  const toggleActivity = useCallback((option) => {
    setSelectedActivity((prevActivities) => {
      if (prevActivities.includes(option)) {
        // If already selected, remove it (toggle off)
        return prevActivities.filter((item) => item !== option);
      } else {
        // If not selected, add it (toggle on)
        return [...prevActivities, option];
      }
    });
  }, []);
  // 1. GPS Location Capture (SIMULATED FOR RN COMPATIBILITY)
  useEffect(() => {
    (async () => {
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.error('Location permission not granted');
        setErrorMsg(
          'Permission to access location was denied. Please enable it in your phone settings.'
        );
        setLoading(false);
        return;
      }

      try {
        // 2. Fetch Current Position
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          // If a cached location is too old, it forces a new fetch.
          maximumAge: 5000,
        });

        // 3. Set Location State
        setLocation(pos.coords);
        setLoading(false);
      } catch (err) {
        console.error('Location Fetch Error:', err);
        setErrorMsg(`Could not get location: ${err.message}`);
        setLoading(false);
      }
    })();

    // Clean up function is not strictly needed here for a one-time fetch,
    // but recommended for subscription listeners.
    // return () => {};
  }, []);

  function handleReturn() {
    // Note: use 'navigate' or 'goBack()' if you want to keep 'Play' on the stack,
    // but 'replace' is fine if you want to swap it out.
    navigation.replace('Home');
  }
  // 2. Form Submission (Supabase)
  const handleSubmit = useCallback(async () => {
    if (!selectedActivity || !location || !userId) {
      showMessage(
        'Please select an activity and ensure location is captured.',
        'error'
      );
      return;
    }

    setSubmitting(true);

    const activityData = {
      user_id: session.user.id,
      user_email: session.user.email,
      latitude: location.latitude,
      longitude: location.longitude,
      activity_type: selectedActivity,
      logged_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert([activityData]);

      if (error) {
        throw new Error(`Supabase Error: ${error.message}`);
      }

      showMessage('Activity logged to Supabase successfully!', 'success');
      navigation.navigate('Home');
    } catch (e) {
      console.error('Supabase Submission Error:', e);
      showMessage(`Submission Failed: ${e.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [selectedActivity, location, userId, navigation]);

  // --- C. Rendering ---

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Fetching GPS location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#fee2e2' }]}>
        <Text style={styles.errorTitle}>{errorMsg}</Text>
        <Text style={styles.errorText}>
          Please enable location services or check permissions.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Activity Title */}
      <Text style={styles.headerTitle}>Log Customer Activity</Text>
      <Text style={styles.userIdText}>
        Current User ID: {userId ? userId.substring(0, 8) + '...' : 'N/A'}
      </Text>

      {/* GPS Location Display */}
      <View style={styles.locationBox}>
        <Text style={styles.locationTitle}>Location Status:</Text>
        <View style={styles.row}>
          <Text style={styles.locationValue}>
            Lat: {location ? location.latitude.toFixed(6) : 'N/A'}
          </Text>
          <Text style={styles.locationValue}>
            Lon: {location ? location.longitude.toFixed(6) : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Activity Selector */}
      <Text style={styles.sectionTitle}>What happened at this stop?</Text>
      <View style={styles.activityOptions}>
        {ACTIVITY_OPTIONS.map((option) => {
          // Check if the current option is in the array
          const isSelected = selectedActivity.includes(option);

          return (
            <View key={option} style={styles.buttonWrapper}>
              <Button
                title={option}
                // Use the new toggle function
                onPress={() => toggleActivity(option)}
                // Set color based on whether it is found in the array
                color={isSelected ? '#10b981' : '#a1a1aa'} // green for selected, gray for unselected
              />
            </View>
          );
        })}
      </View>

      {/* Send Button */}
      <Button
        title={submitting ? 'Sending...' : 'Send Activity Log'}
        onPress={handleSubmit}
        disabled={submitting || !selectedActivity || !userId}
        color={
          submitting || !selectedActivity || !userId ? '#a1a1aa' : '#3b82f6'
        } // gray or blue
      />

      <Button title="go back" onPress={handleReturn} />
      <Button title="Log Activity" onPress={handleLogActivity} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4b5563',
  },
  errorTitle: {
    fontSize: 20,
    color: '#dc2626',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#4b5563',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
  },
  userIdText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 20,
  },
  locationBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationValue: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace', // Not always supported, but conveys intent
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  activityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8, // Requires React Native 0.71+, use margin/padding otherwise
    marginBottom: 30,
  },
  buttonWrapper: {
    minWidth: '45%', // Use minWidth to help with wrapping
    marginVertical: 4,
  },
  // RN Button styling is limited, relying on the 'color' prop
});
