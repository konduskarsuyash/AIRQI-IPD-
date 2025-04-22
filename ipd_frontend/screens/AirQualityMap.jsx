import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://dqyvyyvzymrbsxwpwbab.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeXZ5eXZ6eW1yYnN4d3B3YmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNjEyNDYsImV4cCI6MjA1NzkzNzI0Nn0.gfbg73GU_7C4N1oW0J5A2bXPBFo6IWSfPMBeImc2kaU";

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_TOKEN = '22189a3e2891ce867a4a9773a91900f20960787c';

const categorizeValue = (aqi) => {
  if (aqi <= 50) return { label: 'Good', color: 'rgba(76, 217, 100, 0.8)', borderColor: '#4CD964' };
  if (aqi <= 100) return { label: 'Moderate', color: 'rgba(255, 204, 0, 0.8)', borderColor: '#FFCC00' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'rgba(255, 149, 0, 0.8)', borderColor: '#FF9500' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'rgba(255, 59, 48, 0.8)', borderColor: '#FF3B30' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: 'rgba(175, 82, 222, 0.8)', borderColor: '#AF52DE' };
  return { label: 'Hazardous', color: 'rgba(126, 0, 35, 0.8)', borderColor: '#7E0023' };
};

// AQI calculation functions
// PM1 AQI calculation (using similar thresholds as PM2.5 but adjusted)
const calculatePM1AQI = (pm1) => {
  if (!pm1) return 0;
  let aqi;
  if (pm1 <= 10) aqi = Math.round((pm1 / 10) * 50);
  else if (pm1 <= 30) aqi = Math.round(((pm1 - 10) / (30 - 10)) * (100 - 51) + 51);
  else if (pm1 <= 50) aqi = Math.round(((pm1 - 30) / (50 - 30)) * (150 - 101) + 101);
  else if (pm1 <= 120) aqi = Math.round(((pm1 - 50) / (120 - 50)) * (200 - 151) + 151);
  else if (pm1 <= 200) aqi = Math.round(((pm1 - 120) / (200 - 120)) * (300 - 201) + 201);
  else aqi = Math.round(((pm1 - 200) / (400 - 200)) * (500 - 301) + 301);
  return aqi;
};

// PM2.5 AQI calculation (simplified)
const calculatePM25AQI = (pm25) => {
  if (!pm25) return 0;
  let aqi;
  if (pm25 <= 12) aqi = Math.round((pm25 / 12) * 50);
  else if (pm25 <= 35.4) aqi = Math.round(((pm25 - 12) / (35.4 - 12)) * (100 - 51) + 51);
  else if (pm25 <= 55.4) aqi = Math.round(((pm25 - 35.4) / (55.4 - 35.4)) * (150 - 101) + 101);
  else if (pm25 <= 150.4) aqi = Math.round(((pm25 - 55.4) / (150.4 - 55.4)) * (200 - 151) + 151);
  else if (pm25 <= 250.4) aqi = Math.round(((pm25 - 150.4) / (250.4 - 150.4)) * (300 - 201) + 201);
  else aqi = Math.round(((pm25 - 250.4) / (500.4 - 250.4)) * (500 - 301) + 301);
  return aqi;
};

// PM10 AQI calculation (simplified)
const calculatePM10AQI = (pm10) => {
  if (!pm10) return 0;
  let aqi;
  if (pm10 <= 54) aqi = Math.round((pm10 / 54) * 50);
  else if (pm10 <= 154) aqi = Math.round(((pm10 - 54) / (154 - 54)) * (100 - 51) + 51);
  else if (pm10 <= 254) aqi = Math.round(((pm10 - 154) / (254 - 154)) * (150 - 101) + 101);
  else if (pm10 <= 354) aqi = Math.round(((pm10 - 254) / (354 - 254)) * (200 - 151) + 151);
  else if (pm10 <= 424) aqi = Math.round(((pm10 - 354) / (424 - 354)) * (300 - 201) + 201);
  else aqi = Math.round(((pm10 - 424) / (604 - 424)) * (500 - 301) + 301);
  return aqi;
};

// Calculate AQI based on pollutant values
const calculateAQI = (data) => {
  if (!data) return { value: 0, status: "Unknown", color: "#CCCCCC" };
  
  const pm1AQI = calculatePM1AQI(data.pm1);
  const pm25AQI = calculatePM25AQI(data.pm2_5);
  const pm10AQI = calculatePM10AQI(data.pm10);
  
  // Take the maximum AQI value instead of average for more sensitive alerts
  const maxAQI = Math.max(pm1AQI, pm25AQI, pm10AQI);
  console.log('PM1 AQI:', pm1AQI, 'PM2.5 AQI:', pm25AQI, 'PM10 AQI:', pm10AQI, 'Max AQI:', maxAQI);
  
  return maxAQI;
};

const AirQualityMap = () => {
  const [location, setLocation] = useState(null);
  const [airQualityData, setAirQualityData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocationData, setCurrentLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(10);
  const [userSensorData, setUserSensorData] = useState(null);
  const [userCoordinates, setUserCoordinates] = useState(null);

  useEffect(() => {
    getLocation();
    fetchLatestSensorData();
    
    // Set up real-time subscription to Supabase
    const channel = supabase
      .channel('sensor_data_updates')
      .on('postgres_changes', { 
        event: '*', // Listen for all change events (INSERT, UPDATE, DELETE)
        schema: 'public', 
        table: 'sensor_data' 
      }, (payload) => {
        console.log('New sensor data received in map:', payload.new);
        
        // Map the new data to our format
        const newData = {
          pm1: payload.new.pm1_0,
          pm2_5: payload.new.pm2_5,
          pm10: payload.new.pm10,
          no2: payload.new.no2,
          c2h5oh: payload.new.c2h5oh,
          voc: payload.new.voc,
          co: payload.new.co,
          created_at: payload.new.timestamp
        };
        setUserSensorData(newData);
      })
      .subscribe();
    
    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLatestSensorData = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching sensor data:', error);
        return;
      }

      if (data && data.length > 0) {
        setUserSensorData({
          pm1: data[0].pm1_0,
          pm2_5: data[0].pm2_5,
          pm10: data[0].pm10,
          no2: data[0].no2,
          c2h5oh: data[0].c2h5oh,
          voc: data[0].voc,
          co: data[0].co,
          created_at: data[0].timestamp
        });
      }
    } catch (error) {
      console.error('Error in fetchLatestSensorData:', error);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use the map.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const initialRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
      setLocation(initialRegion);
      setUserCoordinates({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      fetchCurrentLocationData(currentLocation.coords.latitude, currentLocation.coords.longitude);
      fetchAirQualityData(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setLoading(false);
    }
  };

  const fetchCurrentLocationData = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${API_TOKEN}`
      );
      const data = await response.json();
      if (data.status === 'ok') {
        setCurrentLocationData(data.data);
      } else {
        const closestStation = await findClosestStation(lat, lng);
        if (closestStation) {
          setCurrentLocationData(closestStation);
        }
      }
    } catch (error) {
      console.error('Error fetching current location data:', error);
    }
  };

  const findClosestStation = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.waqi.info/map/bounds/?token=${API_TOKEN}&latlng=${lat - 1},${lng - 1},${lat + 1},${lng + 1}`
      );
      const data = await response.json();
      if (data.status === 'ok' && data.data.length > 0) {
        const closest = data.data.reduce((prev, curr) => {
          const prevDistance = Math.sqrt(Math.pow(prev.lat - lat, 2) + Math.pow(prev.lon - lng, 2));
          const currDistance = Math.sqrt(Math.pow(curr.lat - lat, 2) + Math.pow(curr.lon - lng, 2));
          return prevDistance < currDistance ? prev : curr;
        });
        return await fetchStationDetails(closest.uid);
      }
    } catch (error) {
      console.error('Error finding closest station:', error);
    }
    return null;
  };

  const fetchStationDetails = async (stationId) => {
    try {
      const response = await fetch(
        `https://api.waqi.info/feed/@${stationId}/?token=${API_TOKEN}`
      );
      const data = await response.json();
      if (data.status === 'ok') {
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching station details:', error);
    }
    return null;
  };

  const fetchAirQualityData = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.waqi.info/map/bounds/?token=${API_TOKEN}&latlng=${lat - 2},${lng - 2},${lat + 2},${lng + 2}`
      );
      const data = await response.json();
      if (data.status === 'ok') {
        setAirQualityData(data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      setLoading(false);
    }
  };

  const calculateCircleRadius = () => {
    // Adjust radius based on zoom level
    return 1000 * Math.pow(2, 15 - mapZoom);
  };

  const handleRegionChange = (region) => {
    // Calculate zoom level based on latitude delta
    const zoom = Math.log2(360 / region.latitudeDelta) - 1;
    setMapZoom(zoom);
  };

  const handleMarkerPress = async (station) => {
    const stationDetails = await fetchStationDetails(station.uid);
    if (stationDetails) {
      setSelectedLocation(stationDetails);
      setShowDetails(true);
    }
  };

  const handleUserMarkerPress = () => {
    if (userSensorData) {
      const userAQI = calculateAQI(userSensorData);
      setSelectedLocation({
        city: { name: "Your Current Location" },
        aqi: userAQI,
        iaqi: {
          pm1: { v: userSensorData.pm1 },
          pm25: { v: userSensorData.pm2_5 },
          pm10: { v: userSensorData.pm10 },
          no2: { v: userSensorData.no2 },
          voc: { v: userSensorData.voc },
          c2h5oh: { v: userSensorData.c2h5oh },
          co: { v: userSensorData.co },
        },
        time: { s: new Date(userSensorData.created_at).toLocaleString() }
      });
      setShowDetails(true);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      // First, geocode the city name to get coordinates
      const geocodeResult = await Location.geocodeAsync(searchQuery);
      
      if (geocodeResult.length > 0) {
        const { latitude, longitude } = geocodeResult[0];
        
        // Update map location
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setLocation(newRegion);

        // Fetch air quality data for the new location
        await fetchCurrentLocationData(latitude, longitude);
        await fetchAirQualityData(latitude, longitude);
      } else {
        Alert.alert('Location Not Found', 'Please try a different city name.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Calculate user's AQI if sensor data is available
  const userAQI = userSensorData ? calculateAQI(userSensorData) : 0;
  const userAQICategory = userAQI ? categorizeValue(userAQI) : { color: 'rgba(204, 204, 204, 0.8)', borderColor: '#CCCCCC' };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search city..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearch}
          disabled={searchLoading}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={location}
        showsUserLocation={false} // Set to false as we're adding our own user marker
        showsBuildings={true}
        // showsTraffic={true}
        showsIndoors={true}
        showsCompass={true}
        showsPointsOfInterest={true}
        onRegionChangeComplete={handleRegionChange}
      >
        {/* Air Quality Stations Markers */}
        {airQualityData.map((station) => (
          <Marker
            key={`${station.uid}-${station.lat}-${station.lon}`}
            coordinate={{
              latitude: station.lat,
              longitude: station.lon,
            }}
            onPress={() => handleMarkerPress(station)}
          >
            <View style={styles.stationContainer}>
              <View style={[styles.stationBackground, { backgroundColor: categorizeValue(station.aqi).color }]}>
                <Ionicons name="cloud" size={24} color="black" />
                <Text style={styles.stationText}>{station.aqi}</Text>  
              </View>
            </View>
          </Marker>
        ))}

        {/* User's current location with personal sensor data */}
        {userCoordinates && userSensorData && (
          <Marker
            coordinate={userCoordinates}
            onPress={handleUserMarkerPress}
          >
            <View style={styles.personContainer}>
              <View style={[styles.personBackground, { backgroundColor: userAQICategory.color }]}>
                <Ionicons name="person" size={28} color="black" style={styles.personIcon} />
                <Text style={styles.personText}>{userAQI}</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {(currentLocationData || userSensorData) && (
        <View style={[styles.currentLocationCard, styles.elevation]}>
          <Text style={styles.currentLocationTitle}>
            {searchQuery ? 'Searched Location' : 'Current Location'}
          </Text>
          <Text style={styles.currentLocationName}>{currentLocationData?.city?.name || "Your Location"}</Text>
          
          <View style={styles.dataSourcesContainer}>
            {/* API Data */}
            {currentLocationData && (
              <View style={[styles.dataSourceCard, styles.apiCard]}>
                <View style={styles.dataSourceHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="cloud" size={18} color="#fff" />
                  </View>
                  <Text style={styles.dataSourceTitle}>API Station</Text>
                </View>
                <View style={styles.aqiContainer}>
                  <Text style={[
                    styles.aqiValue, 
                    { color: categorizeValue(currentLocationData.aqi).borderColor }
                  ]}>
                    {currentLocationData.aqi}
                  </Text>
                  <Text style={styles.aqiLabel}>
                    {categorizeValue(currentLocationData.aqi).label}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Sensor Data */}
            {userSensorData && (
              <View style={[styles.dataSourceCard, styles.sensorCard]}>
                <View style={styles.dataSourceHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <Text style={styles.dataSourceTitle}>Your Sensor</Text>
                </View>
                <View style={styles.aqiContainer}>
                  <Text style={[
                    styles.aqiValue, 
                    { color: userAQICategory.borderColor }
                  ]}>
                    {userAQI}
                  </Text>
                  <Text style={styles.aqiLabel}>
                    {userAQICategory.label}
                  </Text>
                  {/* {userSensorData.created_at && (
                    <Text style={styles.timestampText}>
                      Updated: {new Date(userSensorData.created_at).toLocaleTimeString()}
                    </Text>
                  )} */}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {showDetails && selectedLocation && (
        <View style={styles.detailsSheet}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowDetails(false)}
          >
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
          
          <ScrollView>
            <Text style={styles.locationName}>{selectedLocation.city.name}</Text>
            <View style={styles.aqiContainer}>
              <Text style={[
                styles.aqiValue, 
                { color: categorizeValue(selectedLocation.aqi).borderColor }
              ]}>
                {selectedLocation.aqi}
              </Text>
              <Text style={styles.aqiLabel}>
                {categorizeValue(selectedLocation.aqi).label}
              </Text>
            </View>
            
            <View style={styles.detailsContainer}>
              {Object.entries(selectedLocation.iaqi).map(([key, value]) => (
                <View key={key} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{key.toUpperCase()}</Text>
                  <Text style={styles.detailValue}>{value.v}</Text>
                </View>
              ))}
            </View>
            
            {/* {selectedLocation.time && (
              <Text style={styles.timeInfo}>
                Last updated: {selectedLocation.time.s}
              </Text>
            )} */}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  currentLocationCard: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  elevation: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentLocationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentLocationName: {
    fontSize: 14,
    marginBottom: 8,
  },
  detailsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aqiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aqiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  aqiLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  stationText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 12,
    position: 'absolute',
    bottom: 5,
  },
  personContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  personBackground: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  personIcon: {
    position: 'absolute',
    top: 2,
  },
  personText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
    position: 'absolute',
    bottom: 5,
  },
  dataSourcesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dataSourceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dataSourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataSourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#fff',
  },
  timestampText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  timeInfo: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  apiCard: {
    backgroundColor: '#2196F3',
  },
  sensorCard: {
    backgroundColor: '#2563EB',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AirQualityMap; 