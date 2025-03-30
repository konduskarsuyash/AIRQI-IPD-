import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import AirQualityMap from './AirQualityMap';
import DataScreen from './DataScreen';
import ProfileScreen from './ProfileScreen';
import CalendarScreen from './CalendarScreen';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        let iconName;
        let IconComponent = Ionicons;

        if (route.name === 'Home') {
          iconName = 'home';
          IconComponent = FontAwesome;
        } else if (route.name === 'Calendar') {
          iconName = 'calendar';
          IconComponent = FontAwesome;
        } else if (route.name === 'Map') {
          iconName = 'map-marker';
          IconComponent = FontAwesome;
        } else if (route.name === 'Data') {
          iconName = 'plus-square';
          IconComponent = FontAwesome;
        } else if (route.name === 'Profile') {
          iconName = 'user';
          IconComponent = FontAwesome;
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Special styling for the Map tab (center button)
        if (route.name === 'Map') {
          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={styles.centerButton}
            >
              <View style={styles.centerButtonCircle}>
                <IconComponent name={iconName} size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={styles.tabButton}
          >
            <IconComponent
              name={iconName}
              size={24}
              color={isFocused ? '#2563EB' : '#9CA3AF'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigation = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Map" component={AirQualityMap} />
      <Tab.Screen name="Data" component={DataScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 80,
  },
  centerButtonCircle: {
    backgroundColor: '#2563EB',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 15,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default TabNavigation; 