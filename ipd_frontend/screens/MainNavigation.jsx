import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './SplashScreen';
import OnboardingScreens from './OnboardingScreens';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import TabNavigation from './TabNavigation';

const Stack = createNativeStackNavigator();

const MainNavigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreens} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen 
          name="MainApp" 
          component={TabNavigation}
          options={{ gestureEnabled: false }} // Prevent going back to login
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigation; 