import React, { useState, useEffect, useCallback } from "react"
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native"
import { Calendar } from "react-native-calendars"
import * as Location from "expo-location"

// Add this debounce function at the top of the file
const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

const AQI_API_URL = "https://api.waqi.info/feed/"
const AQI_TOKEN = "22189a3e2891ce867a4a9773a91900f20960787c"

const CalendarScreen = () => {
  const [location, setLocation] = useState("")
  const [markedDates, setMarkedDates] = useState({})
  const [loading, setLoading] = useState(true)
  const [nearbyStations, setNearbyStations] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  const debouncedSearch = useCallback(
    debounce((text) => setDebouncedSearchQuery(text), 500),
    [],
  )

  const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const fetchStationDetails = async (stationId) => {
    try {
      const response = await fetch(`${AQI_API_URL}@${stationId}/?token=${AQI_TOKEN}`)
      const data = await response.json()
      if (data.status === "ok") {
        return data.data
      }
    } catch (error) {
      console.error("Error fetching station details:", error)
    }
    return null
  }

  const findClosestStation = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.waqi.info/map/bounds/?token=${AQI_TOKEN}&latlng=${lat - 1},${lng - 1},${lat + 1},${lng + 1}`,
      )
      const data = await response.json()

      if (data.status === "ok" && data.data.length > 0) {
        const stationsWithDistance = data.data.map((station) => ({
          ...station,
          distance: getHaversineDistance(lat, lng, station.lat, station.lon),
        }))

        const sortedStations = stationsWithDistance.sort((a, b) => a.distance - b.distance)
        setNearbyStations(sortedStations.slice(0, 5))

        const closestStation = await fetchStationDetails(sortedStations[0].uid)
        return closestStation
      }
    } catch (error) {
      console.error("Error finding closest station:", error)
    }
    return null
  }

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return "#00e400"
    if (aqi <= 100) return "#ffff00"
    if (aqi <= 150) return "#ff7e00"
    if (aqi <= 200) return "#ff0000"
    if (aqi <= 300) return "#8f3f97"
    return "#7e0023"
  }

  const updateCalendarData = (forecastData) => {
    if (!forecastData || !forecastData.forecast || !forecastData.forecast.daily) {
      return
    }

    const newMarkedDates = {}
    const { pm25, pm10, o3 } = forecastData.forecast.daily

    // Combine all pollutant data and use the worst AQI for each day
    pm25.forEach((item) => {
      const dateString = item.day
      const pm10Data = pm10.find((p) => p.day === dateString)
      const o3Data = o3.find((p) => p.day === dateString)

      const maxAQI = Math.max(item.avg, pm10Data ? pm10Data.avg : 0, o3Data ? o3Data.avg : 0)

      newMarkedDates[dateString] = {
        customStyles: {
          container: {
            backgroundColor: getAQIColor(maxAQI),
          },
          text: {
            color: "white",
            fontWeight: "bold",
          },
        },
        aqi: Math.round(maxAQI),
      }
    })

    setMarkedDates(newMarkedDates)
  }

  const fetchLocationAQI = async (searchLocation) => {
    setLoading(true)
    try {
      // First try to get data for the specified location
      const geocodeResponse = await fetch(`https://api.waqi.info/search/?token=${AQI_TOKEN}&keyword=${searchLocation}`)
      const geocodeData = await geocodeResponse.json()

      if (geocodeData.status === "ok" && geocodeData.data.length > 0) {
        const station = geocodeData.data[0]
        const stationData = await fetchStationDetails(station.uid)
        if (stationData) {
          updateCalendarData(stationData)
          setLocation(station.station.name)
        }
      } else {
        // If location not found, find nearest station
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required to fetch AQI data.")
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        const closestStationData = await findClosestStation(location.coords.latitude, location.coords.longitude)

        if (closestStationData) {
          updateCalendarData(closestStationData)
          setLocation(closestStationData.city.name)
          Alert.alert(
            "Location Not Found",
            `Showing data from the nearest available station: ${closestStationData.city.name}`,
          )
        }
      }
    } catch (error) {
      console.error("Error fetching AQI data:", error)
      Alert.alert("Error", "Failed to fetch AQI data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initializeWithUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required to fetch AQI data.")
          setLoading(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        const { latitude, longitude } = location.coords

        const aqiResponse = await fetch(`${AQI_API_URL}geo:${latitude};${longitude}/?token=${AQI_TOKEN}`)
        const aqiData = await aqiResponse.json()

        if (aqiData.status === "ok" && aqiData.data) {
          updateCalendarData(aqiData.data)
        } else {
          const closestStationData = await findClosestStation(latitude, longitude)
          if (closestStationData) {
            updateCalendarData(closestStationData)
          }
        }
      } catch (error) {
        console.error("Error initializing with user location:", error)
        Alert.alert("Error", "Could not fetch initial AQI data.")
      } finally {
        setLoading(false)
      }
    }

    initializeWithUserLocation()
  }, [])

  const handleLocationChange = (text) => {
    setSearchQuery(text)
    debouncedSearch(text)
  }

  useEffect(() => {
    if (debouncedSearchQuery.length > 2) {
      fetchLocationAQI(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery])

  const renderDay = (day, item) => {
    if (item) {
      return (
        <View style={[styles.dayContainer, { backgroundColor: item.customStyles.container.backgroundColor }]}>
          <Text style={styles.dayText}>{day.day}</Text>
          <Text style={styles.aqiText}>{item.aqi}</Text>
        </View>
      )
    }
    return (
      <View style={styles.dayContainer}>
        <Text style={styles.dayText}>{day.day}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AQI Calendar</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter location (e.g., Mumbai)"
        value={searchQuery}
        onChangeText={handleLocationChange}
      />
      <Text style={styles.currentLocation}>Current Location: {location || "Not set"}</Text>
      <Calendar
        style={styles.calendar}
        current={new Date().toISOString().split("T")[0]}
        minDate={new Date().toISOString().split("T")[0]}
        maxDate={new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split("T")[0]}
        hideExtraDays={true}
        disableAllTouchEventsForDisabledDays={true}
        markedDates={markedDates}
        markingType={"custom"}
        dayComponent={({ date, state, marking }) => renderDay(date, marking)}
        theme={{
          calendarBackground: "#F3F4F6",
          textSectionTitleColor: "#6B7280",
          textSectionTitleDisabledColor: "#D1D5DB",
          selectedDayBackgroundColor: "#3B82F6",
          selectedDayTextColor: "#FFFFFF",
          todayTextColor: "#3B82F6",
          dayTextColor: "#1F2937",
          textDisabledColor: "#9CA3AF",
          dotColor: "#3B82F6",
          selectedDotColor: "#FFFFFF",
          arrowColor: "#3B82F6",
          monthTextColor: "#1F2937",
          textDayFontFamily: "System",
          textMonthFontFamily: "System",
          textDayHeaderFontFamily: "System",
          textDayFontWeight: "400",
          textMonthFontWeight: "bold",
          textDayHeaderFontWeight: "400",
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14,
        }}
      />
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>AQI Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#00e400" }]} />
          <Text>Good (0-50)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#ffff00" }]} />
          <Text>Moderate (51-100)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#ff7e00" }]} />
          <Text>Unhealthy for Sensitive Groups (101-150)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#ff0000" }]} />
          <Text>Unhealthy (151-200)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#8f3f97" }]} />
          <Text>Very Unhealthy (201-300)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#7e0023" }]} />
          <Text>Hazardous (301+)</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  legend: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  legendColor: {
    width: 20,
    height: 20,
    marginRight: 10,
    borderRadius: 4,
  },
  dayContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1F2937",
  },
  aqiText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  currentLocation: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    color: "#4B5563",
  },
})

export default CalendarScreen

