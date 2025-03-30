import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      // Glow effect animation
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Navigate to Onboarding after animations
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 3000); // Total animation duration + small delay

    return () => clearTimeout(timer);
  }, [fadeAnim, glowAnim, navigation]);

  // Interpolate glow effect
  const glowStyle = {
    textShadowOffset: { width: 0, height: 0 },
    // textShadowRadius: glowAnim.interpolate({
    //   inputRange: [0, 1],
    //   outputRange: [0, 20]
    // }),
    textShadowColor: '#19185E',
  };

  return (  
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={require('../assets/images/airqi.png')}
        style={styles.backgroundImage}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.logoContainer}>
          <Animated.Text 
            style={[
              styles.logoText,
              {
                opacity: fadeAnim,
              },
              glowStyle,
            ]}
          >
            AirQI
          </Animated.Text>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  logoContainer: {
    zIndex: 1,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#19185E',
    fontFamily: 'System',
  },
});

export default SplashScreen; 