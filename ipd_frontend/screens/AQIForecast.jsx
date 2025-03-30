import React, { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from "react-native"
import Icon from "react-native-vector-icons/Feather"
import * as Location from "expo-location"
import { useNavigation } from "@react-navigation/native"

const AQI_API_URL = "https://api.waqi.info/feed/"
const AQI_TOKEN = "22189a3e2891ce867a4a9773a91900f20960787c"

const AQIForecast = () => {
  const [aqiData, setAqiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedForecast, setSelectedForecast] = useState(null)
  const navigation = useNavigation()

  useEffect(() => {
    const fetchAQIData = async () => {
      try {
        // Check if we already have location permission
        const { status } = await Location.getForegroundPermissionsAsync()
        if (status !== "granted") {
          // Don't request permission again - HomeScreen already did this
          setLoading(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        const { latitude, longitude } = location.coords

        const aqiResponse = await fetch(`${AQI_API_URL}geo:${latitude};${longitude}/?token=${AQI_TOKEN}`)
        const aqiData = await aqiResponse.json()

        setAqiData(aqiData.data)
        // console.log("AQI data:", JSON.stringify(aqiData.data, null, 2))
      } catch (error) {
        console.error("Error fetching data:", error)
        // Use mock data in case of error
        setAqiData(getMockAQIData())
      } finally {
        setLoading(false)
      }
    }

    fetchAQIData()
  }, [])

  // Mock data function for fallback
  const getMockAQIData = () => {
    return {
      forecast: {
        daily: {
          pm25: [
            { day: new Date(Date.now() + 86400000).toISOString().split('T')[0], avg: 45 },
            { day: new Date(Date.now() + 172800000).toISOString().split('T')[0], avg: 53 },
            { day: new Date(Date.now() + 259200000).toISOString().split('T')[0], avg: 34 },
            { day: new Date(Date.now() + 345600000).toISOString().split('T')[0], avg: 28 },
            { day: new Date(Date.now() + 432000000).toISOString().split('T')[0], avg: 62 },
          ],
          pm10: [
            { day: new Date(Date.now() + 86400000).toISOString().split('T')[0], avg: 65 },
            { day: new Date(Date.now() + 172800000).toISOString().split('T')[0], avg: 73 },
            { day: new Date(Date.now() + 259200000).toISOString().split('T')[0], avg: 54 },
            { day: new Date(Date.now() + 345600000).toISOString().split('T')[0], avg: 38 },
            { day: new Date(Date.now() + 432000000).toISOString().split('T')[0], avg: 82 },
          ],
          o3: [
            { day: new Date(Date.now() + 86400000).toISOString().split('T')[0], avg: 25 },
            { day: new Date(Date.now() + 172800000).toISOString().split('T')[0], avg: 33 },
            { day: new Date(Date.now() + 259200000).toISOString().split('T')[0], avg: 44 },
            { day: new Date(Date.now() + 345600000).toISOString().split('T')[0], avg: 38 },
            { day: new Date(Date.now() + 432000000).toISOString().split('T')[0], avg: 52 },
          ]
        }
      }
    }
  }

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return "#00e400"
    if (aqi <= 100) return "#ffff00"
    if (aqi <= 150) return "#ff7e00"
    if (aqi <= 200) return "#ff0000"
    if (aqi <= 300) return "#8f3f97"
    return "#7e0023"
  }

  const getAQILabel = (aqi) => {
    if (aqi <= 50) return "Good"
    if (aqi <= 100) return "Moderate"
    if (aqi <= 150) return "Unhealthy for Sensitive Groups"
    if (aqi <= 200) return "Unhealthy"
    if (aqi <= 300) return "Very Unhealthy"
    return "Hazardous"
  }

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const getFutureForecastData = (forecastData) => {
    const today = new Date().toISOString().split("T")[0]
    return forecastData.filter((item) => item.day > today)
  }

  const showForecastDetails = (forecast) => {
    setSelectedForecast(forecast)
  }

  if (loading || !aqiData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  const futureForecast = getFutureForecastData(aqiData.forecast.daily.pm25)

  return (
    <View style={styles.container}>
      <View style={styles.forecastContainer}>
        <Text style={styles.sectionTitle}>AQI Forecast</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
          {futureForecast.map((item) => (
            <TouchableOpacity key={item.day} style={styles.forecastDay} onPress={() => showForecastDetails(item)}>
              <Text style={styles.forecastDate}>{getDayOfWeek(item.day)}</Text>
              <View style={[styles.aqiCircle, { backgroundColor: getAQIColor(item.avg) }]}>
                <Text style={styles.aqiText}>{Math.round(item.avg)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bar Graph */}
      <View style={styles.barGraphContainer}>
        <View style={styles.barGraphHeader}>
          <Text style={styles.barGraphTitle}>AQ Forcast</Text>
          <View style={styles.barGraphRightHeader}>
            <Text style={styles.nextDaysText}>Next 7 days</Text>
            <TouchableOpacity style={styles.aqiButton}>
              <Text style={styles.aqiButtonText}>AQI</Text>
              <Icon name="chevron-down" size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.barGraph}>
          {futureForecast.map((item, index) => {
            // Generate some random heights for better visualization
            const height = 30 + Math.round(item.avg);
            return (
              <View key={`bar-${index}`} style={styles.barColumn}>
                <View style={styles.barValueContainer}>
                  <Text style={styles.barValue}>{Math.round(item.avg)}</Text>
                </View>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height, 
                      backgroundColor: getAQIColor(item.avg),
                      maxHeight: 120 
                    }
                  ]} 
                />
                <Text style={styles.barDay}>{getDayOfWeek(item.day)}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedForecast !== null}
        onRequestClose={() => setSelectedForecast(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedForecast(null)}>
              <Icon name="x" size={24} color="#000" />
            </TouchableOpacity>
            {selectedForecast && (
              <>
                <Text style={styles.modalTitle}>{getDayOfWeek(selectedForecast.day)} Forecast</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PM2.5:</Text>
                  <Text style={styles.detailValue}>{selectedForecast.avg} (avg)</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PM10:</Text>
                  <Text style={styles.detailValue}>
                    {aqiData.forecast.daily.pm10.find((item) => item.day === selectedForecast.day)?.avg || "N/A"} (avg)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>O3:</Text>
                  <Text style={styles.detailValue}>
                    {aqiData.forecast.daily.o3.find((item) => item.day === selectedForecast.day)?.avg || "N/A"} (avg)
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  },
  header: {
    marginBottom: 24,
    marginTop: 40,
  },
  welcomeText: {
    fontSize: 14,
    color: "#4b5563",
  },
  locationName: {
    fontSize: 40,
    fontWeight: "bold",
    marginTop: 4,
    color: "#111827",
  },
  currentAQI: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationTextContainer: {
    marginLeft: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  aqiLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  aqiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  aqiText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  forecastContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  forecastScroll: {
    flexGrow: 0,
  },
  forecastDay: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 60,
  },
  forecastDate: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  aqiRangeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  aqiRangeText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Bar Graph Styles
  barGraphContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  barGraphHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  barGraphTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  barGraphRightHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextDaysText: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 12,
  },
  aqiButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  aqiButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2563EB",
    marginRight: 4,
  },
  barGraph: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 30,
  },
  barColumn: {
    alignItems: "center",
    width: 36,
  },
  barValueContainer: {
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  barValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4B5563",
  },
  bar: {
    width: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  barDay: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "80%",
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
  },
})

export default AQIForecast

