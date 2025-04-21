import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native"
import { Svg, Circle } from "react-native-svg"
import * as Location from 'expo-location';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AQIForecast from './AQIForecast';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';


// Supabase configuration
const SUPABASE_URL = "https://dqyvyyvzymrbsxwpwbab.supabase.co";
// Use the anon key, not the PostgreSQL password
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeXZ5eXZ6eW1yYnN4d3B3YmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNjEyNDYsImV4cCI6MjA1NzkzNzI0Nn0.gfbg73GU_7C4N1oW0J5A2bXPBFo6IWSfPMBeImc2kaU";

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// PostgreSQL connection info (for reference only, not used in the app)
// postgresql://postgres:DJ01v$04@db.dqyvyyvzymrbsxwpwbab.supabase.co:5432/postgres

// Constants for AQI change threshold
const AQI_CHANGE_THRESHOLD = 20; // Only call API if AQI changes by more than this value

export default function HomeScreen({ navigation }) {
  const username = "Anamoul"
  const [locationName, setLocationName] = useState('Loading...');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [airQualityData, setAirQualityData] = useState(null);
  const [error, setError] = useState(null);
  const [newDataReceived, setNewDataReceived] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [isFetchingRecommendation, setIsFetchingRecommendation] = useState(false);
  const [sound, setSound] = useState(null);
  const [isSoundReady, setIsSoundReady] = useState(false);
  const lastAQI = useRef(null);
  const [soundInitAttempts, setSoundInitAttempts] = useState(0);
  const soundInitTimerRef = useRef(null);

  useEffect(() => {
    getLocation();
    fetchAirQualityData(); // Initial fetch
    
    // Set up real-time subscription to Supabase
    const channel = supabase
      .channel('sensor_data_updates')
      .on('postgres_changes', { 
        event: '*', // Listen for all change events (INSERT, UPDATE, DELETE)
        schema: 'public', 
        table: 'sensor_data' 
      }, async (payload) => {
        // Show a brief refresh indicator
        setIsRefreshing(true);
        setNewDataReceived(true);
        
        // Get the current and previous readings
        const { data, error } = await supabase
          .from('sensor_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(2);
        
        if (error) {
          console.error('Error fetching data for comparison:', error);
          return;
        }
        
        if (data && data.length >= 2) {
          // Map the new data
          const currentData = mapSensorData(data[0]);
          const previousData = mapSensorData(data[1]);
          
          // Calculate AQIs
          const currentAQI = calculateAQI(currentData).value;
          const previousAQI = calculateAQI(previousData).value;
          
          console.log('Real-time AQI check - Current:', currentAQI, 'Previous:', previousAQI);
          
          // Only play sound if AQI has increased significantly
          if (currentAQI > previousAQI + AQI_CHANGE_THRESHOLD) {
            console.log('Significant AQI increase detected! Playing alert...');
            await playAlertSound();
          } else if (currentAQI < previousAQI - AQI_CHANGE_THRESHOLD) {
            console.log('Significant AQI decrease detected, no sound played');
          } else {
            console.log('AQI change within threshold, no sound played');
          }
          
          // Update the UI with new data
          setAirQualityData(currentData);
          generateRecommendation(currentAQI);
        }
        
        // Hide refresh indicator after a short delay
        setTimeout(() => {
          setIsRefreshing(false);
        }, 1000);
        
        // Hide the "new data" message after 3 seconds
        setTimeout(() => {
          setNewDataReceived(false);
        }, 3000);
      })
      .subscribe();
    
    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load sound only once when component mounts
  useEffect(() => {
    const loadSoundOnce = async () => {
      try {
        console.log('Loading sound for the first time...');
        const { sound: newSound } = await Audio.Sound.createAsync(
          require('../assets/alert.mp3'),
          { shouldPlay: false }
        );
        setSound(newSound);
        setIsSoundReady(true);
        console.log('Sound loaded and ready to play');
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    };

    loadSoundOnce();

    // Cleanup function
    return () => {
      if (sound) {
        console.log('Unloading sound...');
        sound.unloadAsync();
        setIsSoundReady(false);
      }
    };
  }, []);

  const playAlertSound = async () => {
    try {
      if (!sound || !isSoundReady) {
        console.log('Sound not ready yet');
        return;
      }

      console.log('Attempting to play sound...');
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.playAsync();
      console.log('Sound played successfully');
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Function to fetch recommendations from the API
  const fetchRecommendations = async (aqiValue) => {
    try {
      setIsFetchingRecommendation(true);
      // Get the JWT token and user_id from storage
      const token = await AsyncStorage.getItem('@Auth:token');
      const userId = await AsyncStorage.getItem('@Auth:user_id');
      
      // console.log('Token retrieved in fetchRecommendations:', token);
      // console.log('User ID retrieved in fetchRecommendations:', userId);
      
      if (!token || !userId) {
        throw new Error('No authentication token or user ID found');
      }

      const response = await fetch('http://192.168.1.33:8000/get_recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: `user_id=${userId}`,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('@Auth:token');
          await AsyncStorage.removeItem('@Auth:user_id');
          navigation.navigate('Login');
          return;
        }
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      // console.log('Recommendations received:', data);
      
      // Update the recommendation state with the API response
      setRecommendation({
        icon: "information-circle",
        title: "Personalized Health Recommendation",
        message: data.recommendations,
        color: getAQIStatus(aqiValue).color,
        level: getAQILevel(aqiValue)
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback to local recommendations if API fails
      generateLocalRecommendation(aqiValue);
    } finally {
      setIsFetchingRecommendation(false);
    }
  };

  // Function to determine if we should fetch new recommendations
  const shouldFetchRecommendations = (newAQI) => {
    if (lastAQI.current === null) {
      return true; // First time, always fetch
    }

    const aqiChange = Math.abs(newAQI - lastAQI.current);
    return aqiChange >= AQI_CHANGE_THRESHOLD;
  };

  // Function to get AQI level
  const getAQILevel = (aqi) => {
    if (aqi <= 50) return "good";
    if (aqi <= 100) return "moderate";
    if (aqi <= 150) return "sensitive";
    if (aqi <= 200) return "unhealthy";
    if (aqi <= 300) return "very-unhealthy";
    return "hazardous";
  };

  // Local recommendation generator (fallback)
  const generateLocalRecommendation = (aqiValue) => {
    let rec = {
      icon: "information-circle",
      title: "Air Quality Information",
      message: "Air quality is being monitored.",
      color: "#4CD964",
      level: "info"
    };

    if (aqiValue <= 50) {
      rec = {
        icon: "checkmark-circle",
        title: "Good Air Quality",
        message: "Air quality is good. It's safe for asthma patients to be outdoors.",
        color: "#4CD964",
        level: "good"
      };
    } else if (aqiValue <= 100) {
      rec = {
        icon: "alert-circle",
        title: "Moderate Air Quality",
        message: "Unusually sensitive asthma patients should consider reducing prolonged outdoor exertion.",
        color: "#FFCC00",
        level: "moderate"
      };
    } else if (aqiValue <= 150) {
      rec = {
        icon: "warning",
        title: "Unhealthy for Sensitive Groups",
        message: "Asthma patients should reduce prolonged or heavy outdoor exertion. Consider wearing a mask outdoors.",
        color: "#FF9500",
        level: "sensitive"
      };
    } else if (aqiValue <= 200) {
      rec = {
        icon: "warning",
        title: "Unhealthy Air Quality",
        message: "Asthma patients should avoid prolonged outdoor exertion. Wear an N95 mask if outdoors.",
        color: "#FF3B30",
        level: "unhealthy"
      };
    } else if (aqiValue <= 300) {
      rec = {
        icon: "alert",
        title: "Very Unhealthy Air Quality",
        message: "Asthma patients should avoid all outdoor activity. Keep windows closed and use an air purifier if available.",
        color: "#AF52DE",
        level: "very-unhealthy"
      };
    } else {
      rec = {
        icon: "alert",
        title: "Hazardous Air Quality",
        message: "Everyone, especially asthma patients, should avoid all outdoor activity. Wear N95 masks if going outside is unavoidable.",
        color: "#7e0023",
        level: "hazardous"
      };
    }
    
    setRecommendation(rec);
  };

  // Generate health recommendation based on AQI
  const generateRecommendation = (aqiValue) => {
    if (shouldFetchRecommendations(aqiValue)) {
      // console.log('AQI change significant, fetching new recommendations');
      fetchRecommendations(aqiValue);
      lastAQI.current = aqiValue;
    } else {
      console.log('AQI change not significant, using local recommendations');
      generateLocalRecommendation(aqiValue);
    }
  };

  // Helper function to map sensor data to our app format
  const mapSensorData = (data) => {
    return {
      pm1: data.pm1_0,
      pm2_5: data.pm2_5,
      pm10: data.pm10,
      no2: data.no2,
      c2h5oh: data.c2h5oh,
      voc: data.voc,
      co: data.co,
      created_at: data.timestamp
    };
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName("Location access denied");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      
      // Get location name
      const geocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      
      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        // console.log(address);
        setLocationName(address.name || address.street || 'Unknown');
        setCity(address.city || address.region || 'Birmingham');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationName("Church Street Square");
      setCity("Birmingham");
    }
  };

  const fetchAirQualityData = async () => {
    const initialLoad = !airQualityData;
    if (initialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    try {
      // Fetch the last two readings to compare AQI values
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(2);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
  
      if (data && data.length > 0) {
        // Get current and previous readings
        const currentData = data[0];
        const previousData = data.length > 1 ? data[1] : null;
        
        // Map the current data
        const mappedData = mapSensorData(currentData);
        setAirQualityData(mappedData);
        
        // Calculate current AQI
        const currentAQI = calculateAQI(mappedData).value;
        
        // Calculate previous AQI if we have previous data
        const previousAQI = previousData ? calculateAQI(mapSensorData(previousData)).value : null;
        
        console.log('Current AQI:', currentAQI, 'Previous AQI:', previousAQI);
        
        // Check for significant AQI increase compared to previous reading
        if (previousAQI !== null && currentAQI > previousAQI + AQI_CHANGE_THRESHOLD) {
          console.log('Significant AQI increase detected! Playing alert...');
          await playAlertSound();
        }
        
        lastAQI.current = currentAQI;
        generateRecommendation(currentAQI);
      } else {
        console.log('No data found in Supabase!');
        const mockData = getMockAirQualityData();
        setAirQualityData(mockData);
        
        const aqi = calculateAQI(mockData).value;
        generateRecommendation(aqi);
      }
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      setError('Failed to fetch air quality data');
      const mockData = getMockAirQualityData();
      setAirQualityData(mockData);
      
      const aqi = calculateAQI(mockData).value;
      generateRecommendation(aqi);
    } finally {
      if (initialLoad) {
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      } else {
        setIsRefreshing(false);
      }
    }
  };
  
  

  // Mock data function for fallback
  const getMockAirQualityData = () => {
    return {
      pm1: 18,
      pm10: 25,
      pm2_5: 12,
      no2: 22,
      c2h5oh: 15,
      voc: 30,
      created_at: new Date().toISOString()
    };
  };

  // Calculate AQI based on pollutant values
  const calculateAQI = (data) => {
    if (!data) return { value: 0, status: "Unknown", color: "#CCCCCC" };
    
    const pm1AQI = calculatePM1AQI(data.pm1);
    const pm25AQI = calculatePM25AQI(data.pm2_5);
    const pm10AQI = calculatePM10AQI(data.pm10);
    
    // Calculate the average AQI value instead of taking the maximum
    const avgAQI = Math.round((pm1AQI + pm25AQI + pm10AQI) / 3);
    
    return {
      value: avgAQI,
      ...getAQIStatus(avgAQI)
    };
  };

// PM1 AQI calculation (using similar thresholds as PM2.5 but adjusted)
const calculatePM1AQI = (pm1) => {
  // console.log("PM1 Input:", pm1);
  let aqi;
  if (pm1 <= 10) aqi = Math.round((pm1 / 10) * 50);
  else if (pm1 <= 30) aqi = Math.round(((pm1 - 10) / (30 - 10)) * (100 - 51) + 51);
  else if (pm1 <= 50) aqi = Math.round(((pm1 - 30) / (50 - 30)) * (150 - 101) + 101);
  else if (pm1 <= 120) aqi = Math.round(((pm1 - 50) / (120 - 50)) * (200 - 151) + 151);
  else if (pm1 <= 200) aqi = Math.round(((pm1 - 120) / (200 - 120)) * (300 - 201) + 201);
  else aqi = Math.round(((pm1 - 200) / (400 - 200)) * (500 - 301) + 301);
  
  // console.log("PM1 AQI:", aqi);
  return aqi;
};

// PM2.5 AQI calculation (simplified)
const calculatePM25AQI = (pm25) => {
  // console.log("PM2.5 Input:", pm25);
  let aqi;
  if (pm25 <= 12) aqi = Math.round((pm25 / 12) * 50);
  else if (pm25 <= 35.4) aqi = Math.round(((pm25 - 12) / (35.4 - 12)) * (100 - 51) + 51);
  else if (pm25 <= 55.4) aqi = Math.round(((pm25 - 35.4) / (55.4 - 35.4)) * (150 - 101) + 101);
  else if (pm25 <= 150.4) aqi = Math.round(((pm25 - 55.4) / (150.4 - 55.4)) * (200 - 151) + 151);
  else if (pm25 <= 250.4) aqi = Math.round(((pm25 - 150.4) / (250.4 - 150.4)) * (300 - 201) + 201);
  else aqi = Math.round(((pm25 - 250.4) / (500.4 - 250.4)) * (500 - 301) + 301);
  
  // console.log("PM2.5 AQI:", aqi);
  return aqi;
};

// PM10 AQI calculation (simplified)
const calculatePM10AQI = (pm10) => {
  // console.log("PM10 Input:", pm10);
  let aqi;
  if (pm10 <= 54) aqi = Math.round((pm10 / 54) * 50);
  else if (pm10 <= 154) aqi = Math.round(((pm10 - 54) / (154 - 54)) * (100 - 51) + 51);
  else if (pm10 <= 254) aqi = Math.round(((pm10 - 154) / (254 - 154)) * (150 - 101) + 101);
  else if (pm10 <= 354) aqi = Math.round(((pm10 - 254) / (354 - 254)) * (200 - 151) + 151);
  else if (pm10 <= 424) aqi = Math.round(((pm10 - 354) / (424 - 354)) * (300 - 201) + 201);
  else aqi = Math.round(((pm10 - 424) / (604 - 424)) * (500 - 301) + 301);

  // console.log("PM10 AQI:", aqi);
  return aqi;
};



// Get AQI status based on value
const getAQIStatus = (aqi) => {
  // console.log("AQI Input:", aqi);
  let status;
  if (aqi <= 50) status = { status: "Good", color: "#4CD964" }; // Green
  else if (aqi <= 100) status = { status: "Moderate", color: "#FFCC00" }; // Yellow
  else if (aqi <= 150) status = { status: "Unhealthy for Sensitive Groups", color: "#FF9500" }; // Orange
  else if (aqi <= 200) status = { status: "Unhealthy", color: "#FF3B30" }; // Red
  else if (aqi <= 300) status = { status: "Very Unhealthy", color: "#AF52DE" }; // Purple
  else status = { status: "Hazardous", color: "#7e0023" }; // Maroon

  // console.log("AQI Status:", status);
  return status;
};


  // Get color for specific pollutant based on its AQI value
  const getPollutantColor = (type, value) => {
    switch(type) {
      case 'pm1':
        return getAQIStatus(calculatePM1AQI(value)).color;
      case 'pm2_5':
        return getAQIStatus(calculatePM25AQI(value)).color;
      case 'pm10':
        return getAQIStatus(calculatePM10AQI(value)).color;
      default:
        // For pollutants without standardized AQI calculations, use a general scale
        if (value <= 10) return "#4CD964"; // Green
        if (value <= 25) return "#FFCC00"; // Yellow
        if (value <= 40) return "#FF9500"; // Orange
        if (value <= 65) return "#FF3B30"; // Red
        return "#AF52DE"; // Purple
    }
  };

  const aqiInfo = airQualityData ? calculateAQI(airQualityData) : { value: 0, status: "Unknown", color: "#CCCCCC" };

  // Format the metrics for display
  const metrics = airQualityData ? [
    { name: "PM1", value: airQualityData.pm1, unit: "μg/m3", color: getPollutantColor('pm1', airQualityData.pm1) },
    { name: "PM10", value: airQualityData.pm10, unit: "μg/m3", color: getPollutantColor('pm10', airQualityData.pm10) },
    { name: "PM2.5", value: airQualityData.pm2_5, unit: "μg/m3", color: getPollutantColor('pm2_5', airQualityData.pm2_5) },
    { name: "NO2", value: airQualityData.no2, unit: "μg/m3", color: getPollutantColor('no2', airQualityData.no2) },
    { name: "C2H5OH", value: airQualityData.c2h5oh, unit: "μg/m3", color: getPollutantColor('c2h5oh', airQualityData.c2h5oh) },
    { name: "VOC", value: airQualityData.voc, unit: "μg/m3", color: getPollutantColor('voc', airQualityData.voc) },
  ] : [];

  const handleLogin = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://192.168.1.33:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      // console.log('Login response data:', data);
      
      // Store the token
      await AsyncStorage.setItem('access_token', data.access_token);
      // console.log('Token stored in AsyncStorage');
      
      // Verify the token was stored
      const storedToken = await AsyncStorage.getItem('access_token');
      // console.log('Stored token verification:', storedToken);
      
      navigation.navigate('Home');
    } catch (error) {
      console.error('Login error:', error);
      // Handle error appropriately
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading air quality data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Test Sound Button */}
        {/* <TouchableOpacity 
          style={styles.testButton}
          onPress={playAlertSound}
        >
          <Text style={styles.testButtonText}>Test Sound</Text>
        </TouchableOpacity> */}

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome Back 👋</Text>
          <Text style={styles.username}>{username}</Text>
        </View>

        {/* Location Indicator */}
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => navigation.navigate('Map')}
        >
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={20} color="#2563EB" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationCity}>{city}</Text>
          </View>
        </TouchableOpacity>

        {/* Health Recommendation for Asthma Patients */}
        {recommendation && (
          <View style={[styles.recommendationCard, { borderColor: recommendation.color }]}>
            <View style={styles.recommendationHeader}>
              <Ionicons name={recommendation.icon} size={24} color={recommendation.color} />
              <Text style={[styles.recommendationTitle, { color: recommendation.color }]}>
                {recommendation.title}
              </Text>
              {isFetchingRecommendation && (
                <ActivityIndicator size="small" color={recommendation.color} style={styles.recommendationLoading} />
              )}
            </View>
            <Text style={styles.recommendationMessage}>
              {recommendation.message}
            </Text>
            {recommendation.level !== 'good' && recommendation.level !== 'moderate' && (
              <View style={styles.recommendationAction}>
                <Ionicons name="medical" size={18} color={recommendation.color} />
                <Text style={styles.recommendationActionText}>
                  Asthma patients: {
                    recommendation.level === 'sensitive' ? 'Consider using inhalers before going outside.' :
                    recommendation.level === 'unhealthy' ? 'Keep rescue inhalers nearby at all times.' :
                    'Consult your doctor and stay indoors if possible.'
                  }
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Air Quality Section */}
        <View style={styles.airQualityCard}>
          <View style={styles.airQualityHeader}>
            <Text style={styles.airQualityTitle}>Air Quality</Text>
            <View style={styles.headerRight}>
              {isRefreshing && (
                <ActivityIndicator size="small" color="#2563EB" style={styles.refreshIndicator} />
              )}
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </View>

          {/* New data notification */}
          {newDataReceived && (
            <View style={styles.newDataBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
              <Text style={styles.newDataText}>New data received</Text>
            </View>
          )}

          {/* Air Quality Gauge */}
          <View style={styles.gaugeContainer}>
            <Svg height="160" width="160" viewBox="0 0 100 100">
              {/* Outer circle with color based on AQI */}
              <Circle 
                cx="50" 
                cy="50" 
                r="45" 
                stroke={aqiInfo.color} 
                strokeWidth="10" 
                fill="transparent" 
              />
              {/* Inner circle (white) */}
              <Circle cx="50" cy="50" r="35" fill="white" />
            </Svg>
            <View style={styles.gaugeTextContainer}>
              <Text style={styles.gaugeValue}>{aqiInfo.value}</Text>
            </View>
          </View>

          {/* AQI Status - Repositioned here */}
          <View style={styles.aqiStatusContainer}>
            <View style={[styles.statusDot, { backgroundColor: aqiInfo.color }]} />
            <Text style={[styles.statusText, { color: aqiInfo.color }]}>{aqiInfo.status}</Text>
          </View>

          {/* Last Updated Info */}
          {/* {airQualityData && airQualityData.created_at && (
            <Text style={styles.updatedText}>
              Last updated: {new Date(airQualityData.created_at).toLocaleString()}
            </Text>
          )} */}

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <View key={index} style={styles.metricItem}>
                <View style={[styles.indicatorBar, { backgroundColor: metric.color }]} />
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricName}>
                    {metric.name} <Text style={styles.metricUnit}>({metric.unit})</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* AQI Forecast Section */}
        <AQIForecast />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  welcomeSection: {
    marginTop: 50,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  username: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center', 
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  locationIconContainer: {
    width: 36,
    height: 36, 
    borderRadius: 18,
    backgroundColor: '#e6effd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  locationCity: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recommendationMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  recommendationActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  airQualityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  airQualityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  airQualityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    position: "relative",
  },
  gaugeTextContainer: {
    position: "absolute",
    alignItems: "center",
  },
  gaugeValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#000",
  },
  aqiStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  updatedText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },
  metricItem: {
    width: "48%",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
  },
  indicatorBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 8,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  metricName: {
    fontSize: 12,
    color: "#555",
  },
  metricUnit: {
    fontSize: 10,
    color: "#888",
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIndicator: {
    marginLeft: 8,
  },
  newDataBanner: {
    backgroundColor: '#edf9ee',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDataText: {
    fontSize: 14,
    color: '#4CD964',
    fontWeight: '500',
    marginLeft: 6,
  },
  recommendationLoading: {
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

