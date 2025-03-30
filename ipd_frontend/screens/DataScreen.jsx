import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const DataScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Air Quality Data</Text>
      <Text style={styles.subtitle}>Historical data and statistics coming soon!</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default DataScreen; 