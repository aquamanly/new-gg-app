import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import SignIn from './Signin';
import { View, Text, ActivityIndicator } from 'react-native';

export default function Redirect({ navigation }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
      if (session) navigation.replace('Home');
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) navigation.replace('Home');
      // ❌ don't navigate on logout — just let SignIn render
    });

    return () => subscription.unsubscribe();
  }, [navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }
  // OR
  if (session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" />
        <Text style={{ marginTop: 10 }}>Entering Dashboard...</Text>
      </View>
    );
  }

  // If no session, show SignIn
  return <SignIn />;
}
