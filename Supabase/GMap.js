import * as Location from 'expo-location';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    TouchableOpacity, // Used for the activity buttons
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';
import { supabase } from './supabase'; // Import supabase for submission
import { MaterialIcons } from '@expo/vector-icons';
// --- Configuration and Helpers ---
// Predefined activity options (from your LogActivity)
const ACTIVITY_OPTIONS = [
    'Not Home',
    'Sold',
    'No Soliciting',
    'Mosquito Sale',
    'Tree and Shrub Sale',
];
const EARTH_RADIUS_MILES = 3958.8; // Radius of Earth in miles
/**
 * Calculates the distance between two coordinates in miles using the Haversine formula.
 * This is used for filtering pins based on map center.
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
    const deg2rad = (deg) => deg * (Math.PI / 180);
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_MILES * c;
};
/**
* Converts latitude and longitude to a human-readable address (using Nominatim).
*/
const reverseGeocode = async (lat, lon) => {
    try {
        // Note: Nominatim requires a user-agent header
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'RN-GeoApp/1.0 (contact@example.com)'
            }
        });
        const data = await response.json();
        if (data && data.display_name) {
            return data.display_name;
        }
    } catch (error) {
        console.error("Reverse Geocoding Error:", error);
    }
    return null;
};
// Helper to show messages (uses RN Alert)
const showMessage = (msg, type = 'success') => {
    Alert.alert(type === 'success' ? 'Success' : 'Error', msg);
};
export default function GMap({ navigation, route }) {
    // Map/Location States
    const [currentLocation, setCurrentLocation] = useState(null);
    const [markerCoordinate, setMarkerCoordinate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [session, setSession] = useState(null);
    const [existingPins, setExistingPins] = useState([]);
    const [selectedPin, setSelectedPin] = useState(null);
    const [selectedPinId, setSelectedPinId] = useState(null);

    // Activity Log States
    const [selectedActivity, setSelectedActivity] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showActivityOverlay, setShowActivityOverlay] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null); // Stores lat/lon/address for log

    /**
     * Fetches ALL activity logs for the current user and stores them in allUserPins. 
     * But it only does it once. So I need to make it so that it runs every time it's successfull with the additional save. 
     * Maybe theres a way to clear the data before  running this. Hmmm...
     * @todo: investigate the refresh on this.
     */

    // Add this helper function outside of the first useEffect
const fetchExistingPins = async () => {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('logged_at', { ascending: false });

        if (error) {
            console.error('Error fetching existing pins:', error);
            return;
        }
        setExistingPins(data || []);
    } catch (err) {
        console.error('Unexpected error fetching pins:', err);
    }
};

// Replace the first useEffect with a simple call:
useEffect(() => {
    fetchExistingPins();
    // You might need to add fetchExistingPins to dependencies if you use useCallback, but for now, keep it simple.
}, []);
    /* useEffect(() => {
        const fetchExistingPins = async () => {
            try {
                const { data, error } = await supabase
                    .from('activity_logs')
                    .select('*')
                    .order('logged_at', { ascending: false });

                if (error) {
                    console.error('Error fetching existing pins:', error);
                    return;
                }

                setExistingPins(data || []);
            } catch (err) {
                console.error('Unexpected error fetching pins:', err);
            }
        };

        fetchExistingPins();
    }, []); */


    // --- A. Setup and Location Logic ---
    /**
     * So once the app boots, it looks for your location and sets it. Thats it. 
     */
    useEffect(() => {
        // 1. Fetch Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        // 2. Fetch User's Current Location
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied.');
                setIsLoading(false);
                return;
            }
            try {
                let location = await Location.getCurrentPositionAsync({});
                setCurrentLocation(location.coords);
            } catch (error) {
                console.error("Error fetching location:", error);
                Alert.alert('Location Error', 'Could not get your current location.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // --- B. Activity Logic ---
    // New handler to toggle an option in the array (from LogActivity)
    const toggleActivity = useCallback((option) => {
        setSelectedActivity((prevActivities) => {
            // 🚨 ADD THIS LINE 🚨
            const activities = prevActivities || []; // Failsafe: Use [] if prevActivities is null/undefined

            if (activities.includes(option)) {
                return activities.filter((item) => item !== option);
            } else {
                return [...activities, option];
            }
        });
    }, []);

    // 2. Form Submission (Supabase)
    const handleSubmit = useCallback(async () => {
        if (selectedActivity.length === 0 || !selectedLocation || !session) {
            showMessage(
                'Please select at least one activity and ensure a location is selected.',
                'error'
            );
            return;
        }
        setSubmitting(true);
        const activityData = {
            user_id: session.user.id,
            user_email: session.user.email,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            activity_type: selectedActivity,
            logged_at: new Date().toISOString(),
            // Optionally log the address if found
            address: selectedLocation.address || 'Coordinates Only',
        };
        try {
            const { error } = await supabase
                .from('activity_logs')
                .insert([activityData]);
            if (error) {
                throw new Error(`Supabase Error: ${error.message}`);
            }
            showMessage('Activity logged successfully!', 'success');
            await fetchExistingPins(); // ✅ Refresh the map pins!
            // Reset state and hide overlay after successful submission
            setSelectedActivity([]);
            setShowActivityOverlay(false);
            setSelectedLocation(null);
        } catch (e) {
            console.error('Supabase Submission Error:', e);
            showMessage(`Submission Failed: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    }, [selectedActivity, selectedLocation, session]);
    /**
     * const response = await supabase
      .from('countries')
      .delete()
      .eq('id', 1)
     */

    const handleDelete = useCallback(async () => {
        if (selectedActivity.length === 0 || !selectedLocation || !session) {
            showMessage(
                'Please select at least one activity and ensure a location is selected.',
                'error'
            );
            return;
        }

        if (!selectedPinId) {  // 👈 This is the ID of the record you're editing
            showMessage('No activity selected to edit.', 'error');
            return;
        }

        setSubmitting(true);

        const updatedData = {
            user_id: session.user.id,
            user_email: session.user.email,
            activity_type: selectedActivity.toString(),
        };

        try {
            /*        = await supabase
                       .from('activity_logs')
                       .update(updatedData) // <-- FIXED
                       .eq('id', selectedPinId).select(); */

            const   {  error } = await supabase
                .from('activity_logs')
                .delete()
                .eq('id', selectedPinId)

            if (error) {
                showMessage(`Supabase Error: ${error.message}`, 'error');
                throw new Error(`Supabase Error: ${error.message}`);
            }

            showMessage('Pin Deleted!', 'success');
            await fetchExistingPins(); // ✅ Refresh the map pins!
            // Reset state and close overlay after successful update
            setSelectedActivity([]);
            setShowActivityOverlay(false);
            setSelectedLocation(null);
            setSelectedPinId(null);
            setSelectedPin(null);

        } catch (e) {
            console.error('Supabase Update Error:', e);
            showMessage(`Update Failed: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    }, [selectedActivity, selectedLocation, session]);




    const handleUpdate = useCallback(async () => {
        if (selectedActivity.length === 0 || !selectedLocation || !session) {
            showMessage(
                'Please select at least one activity and ensure a location is selected.',
                'error'
            );
            return;
        }

        if (!selectedPinId) {  // 👈 This is the ID of the record you're editing
            showMessage('No activity selected to edit.', 'error');
            return;
        }

        setSubmitting(true);

        const updatedData = {
            user_id: session.user.id,
            user_email: session.user.email,
            activity_type: selectedActivity,
        };

        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .update(updatedData) // <-- FIXED
                .eq('id', selectedPinId).select();

            if (error) {
                showMessage(`Supabase Error: ${error.message}`, 'error');
                throw new Error(`Supabase Error: ${error.message}`);
            }

            showMessage('Activity updated successfully!', 'success');
            await fetchExistingPins(); // ✅ Refresh the map pins!
            // Reset state and close overlay after successful update
            setSelectedActivity([]);
            setShowActivityOverlay(false);
            setSelectedLocation(null);
            setSelectedPinId(null);
            setSelectedPin(null);

        } catch (e) {
            console.error('Supabase Update Error:', e);
            showMessage(`Update Failed: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    }, [selectedActivity, selectedLocation, session]);


    // --- C. Map Interaction Logic ---
    const handleLongPress = useCallback(async (e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMarkerCoordinate({ latitude, longitude });
        const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        // Attempt to get the address
        const address = await reverseGeocode(latitude, longitude);
        const message = `Location Selected:\n\n` +
            (address ? `Address: ${address}\n\n` : `Address: Not Found\n\n`) +
            `Coordinates: ${coordinates}\n\n` +
            `Do you want to log activity at this location?`;
        const locationData = { latitude, longitude, address };
        const addressToCopy = address || coordinates;
        // First Alert: Confirm/Copy Menu
        Alert.alert(
            "Location Captured",
            message,
            [
                {
                    text: "Copy Coordinates",
                    onPress: () => {
                        Clipboard.setStringAsync(coordinates);
                        Alert.alert("Copied!", `Coordinates Copied: ${coordinates}`);
                    },
                },
                // Only show "Copy Address" if one was found and it's different from coords
                ...(address ? [{
                    text: "Copy Address",
                    onPress: () => {
                        Clipboard.setStringAsync(address);
                        Alert.alert("Copied!", `Address Copied: ${address.substring(0, 50)}...`);
                    },
                }] : []),
                {
                    text: "Continue to Log",
                    onPress: () => {
                        setSelectedLocation(locationData);
                        setShowActivityOverlay(true); // Show the activity overlay
                    },
                }
            ]
        );
    }, []);
    // --- D. Rendering ---
    if (isLoading || !session) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading app data...</Text>
            </View>
        );
    }
    const initialMapRegion = {
        latitude: currentLocation?.latitude || 37.78825,
        longitude: currentLocation?.longitude || -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };
    // The conditional overlay component (moved from LogActivity)
    const ActivityOverlay = () => {
        const { latitude, longitude, address } = selectedLocation;
        // Format the address for display
        const formattedAddress = address
            ? address.substring(0, 40) + '...'
            : 'No address found.';
        // Format coordinates
        const formattedCoords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        return (
            <View style={styles.overlay}>
                <View style={styles.overlayContent}>
                    <Text style={styles.headerTitle}>Log Activity at Location</Text>
                    {/* Location Display */}
                    <View style={styles.locationBox}>
                        <Text style={styles.locationTitle}>Selected Location:</Text>
                        <Text style={styles.locationValue}>**Address:** {formattedAddress}</Text>
                        <Text style={styles.locationValue}>**Coords:** {formattedCoords}</Text>
                    </View>
                    {/* Activity Selector */}
                    <Text style={styles.sectionTitle}>What happened at this stop?</Text>
                    <View style={styles.activityOptions}>
                        {ACTIVITY_OPTIONS.map((option) => {
                            const isSelected = selectedActivity.includes(option);
                            return (
                                <View key={option} style={styles.buttonWrapper}>
                                    <TouchableOpacity
                                        onPress={() => toggleActivity(option)}
                                        style={[
                                            styles.activityButton,
                                            isSelected ? styles.activityButtonSelected : styles.activityButtonUnselected,
                                        ]}
                                        disabled={submitting}
                                    >
                                        <Text style={styles.activityButtonText}>{option}</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                    {/* Action Buttons */}
                    {selectedPinId ? (
                        
                            <Button
                                title={submitting ? 'Updating...' : 'Update Activity Log'}
                                onPress={handleUpdate}
                                disabled={submitting || selectedActivity.length === 0}
                                color={submitting || selectedActivity.length === 0 ? '#a1a1aa' : '#3b82f6'}
                            />
                         
                    ) : (
                        <Button
                            title={submitting ? 'Sending...' : 'Send Activity Log'}
                            onPress={handleSubmit}
                            disabled={submitting || selectedActivity.length === 0}
                            color={submitting || selectedActivity.length === 0 ? '#a1a1aa' : '#3b82f6'}
                        />
                    )}

            {selectedPinId ? (
                        
                        <Button
                            title={submitting ? 'Deleting...' : 'Delete Activity Log'}
                            onPress={handleDelete}
                            disabled={submitting || selectedActivity.length === 0}
                            color={submitting || selectedActivity.length === 0 ? '#a1a1aa' : '#3b82f6'}
                        />
                     
                ) : (
                    <Button
                        title={submitting ? 'Sending...' : 'Send Activity Log'}
                        onPress={handleSubmit}
                        disabled={submitting || selectedActivity.length === 0}
                        color={submitting || selectedActivity.length === 0 ? '#a1a1aa' : '#3b82f6'}
                    />
                )}

                    <View style={{ marginTop: 10 }}>
                        <Button
                            title="Cancel Log"
                            onPress={() => {
                                setShowActivityOverlay(false);
                                setSelectedActivity([]); // Reset selected activities
                                setSelectedLocation(null);
                                setMarkerCoordinate(currentLocation); // Reset marker to user location
                            }}
                            color="#dc2626" // Red color for cancel
                        />
                    </View>
                </View>
            </View>
        );
    };
    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={initialMapRegion}
                onLongPress={handleLongPress}
                // Prevents map interaction while the overlay is visible
                scrollEnabled={!showActivityOverlay}
                zoomEnabled={!showActivityOverlay}
            >
                {existingPins.map((pin) => (
                    <Marker
                        key={pin.id}
                        coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                        pinColor="blue"
                        onPress={() => {
                            setSelectedPin(pin);
                            setSelectedPinId(pin.id);
                            setSelectedActivity(pin.activity_type || []); // prefill activities if available
                            setSelectedLocation({
                                latitude: pin.latitude,
                                longitude: pin.longitude,
                                address: pin.address || 'Coordinates Only'
                            });
                            setShowActivityOverlay(true);
                        }}
                    />
                ))}

                {/* Marker is always at the last selected or current location */}
                {markerCoordinate && (
                    <Marker
                        coordinate={markerCoordinate}
                        title="Selected Location"
                        pinColor={showActivityOverlay ? 'red' : 'blue'}
                    />
                )}
            </MapView>
            {/* Conditionally render the activity logging overlay */}
            {showActivityOverlay && selectedLocation && <ActivityOverlay />}
        </View>
    );
}
// --- Styles (Consolidated and Cleaned) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    map: {
        flex: 1,
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
    headerTitle: {
        fontSize: 22, // Adjusted for the overlay box
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#1f2937',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
        marginTop: 10,
    },
    locationBox: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        marginBottom: 15,
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e40af',
        marginBottom: 5,
    },
    locationValue: {
        fontSize: 13,
        color: '#374151',
    },
    activityOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    buttonWrapper: {
        width: '48%', // Allow for two buttons per row with a small gap
        marginVertical: 4,
    },
    // Custom button styling for the activity options
    activityButton: {
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityButtonSelected: {
        backgroundColor: '#10b981', // green
        borderWidth: 1,
        borderColor: '#059669',
    },
    activityButtonUnselected: {
        backgroundColor: '#e5e7eb', // light gray
        borderWidth: 1,
        borderColor: '#a1a1aa',
    },
    activityButtonText: {
        color: '#1f2937', // dark text
        fontWeight: '600',
    },
    // --- OVERLAY STYLES ---
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark semi-transparent background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    overlayContent: {
        width: '95%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%', // Limit height on smaller screens
    },
    // ... (Removed duplicate/unused styles from your original LogActivity)
});