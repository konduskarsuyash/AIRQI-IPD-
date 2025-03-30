import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ImageBackground } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  // User data
  const userData = {
    name: 'Anamoul Rouf',
    email: 'anamoulrouf.bd@gmail.com'
  };

  // Menu items
  const menuItems = [
    { 
      id: 'profile',
      title: 'Profile', 
      icon: <Ionicons name="person" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('Profile pressed') 
    },
    { 
      id: 'saved',
      title: 'Saved Location', 
      icon: <MaterialIcons name="location-on" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('Saved locations pressed') 
    },
    { 
      id: 'faq',
      title: 'FAQ', 
      icon: <MaterialIcons name="help" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('FAQ pressed') 
    },
    { 
      id: 'settings',
      title: 'Settings', 
      icon: <Ionicons name="settings-outline" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('Settings pressed') 
    },
    { 
      id: 'about',
      title: 'About Us', 
      icon: <Ionicons name="shield-checkmark-outline" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('About us pressed') 
    },
    { 
      id: 'contact',
      title: 'Contact Us', 
      icon: <Ionicons name="call-outline" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('Contact us pressed') 
    },
    { 
      id: 'logout',
      title: 'Logout', 
      icon: <MaterialCommunityIcons name="logout" size={22} color="#2563EB" />,
      iconBg: '#e0eaff',
      action: () => console.log('Logout pressed') 
    },
  ];

  const renderMenuItem = (item) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.menuItem}
      onPress={item.action}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: item.iconBg }]}>
        {item.icon}
      </View>
      <Text style={styles.menuItemText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#C5C5C7" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header with Background Image */}
        <ImageBackground 
          source={require('../assets/images/bg.png')}
          style={styles.profileHeader}
        >
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{userData.name}</Text>
            <Text style={styles.email}>{userData.email}</Text>
          </View>
        </ImageBackground>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map(renderMenuItem)}
        </View>

        {/* App Info - You'll add the image here */}
        <View style={styles.appInfoContainer}>
          <View style={styles.appInfo}>
            <Image 
              source={require('../assets/images/air-aq-logo.png')}
              style={styles.appLogo}
            />
            <Text style={styles.appName}>Air AQ</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  profileHeader: {
    height: 180,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 100,
    padding: 16,
    // backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    minWidth: 100,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  appInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  appInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  appLogo: {
    width: 30,
    height: 30,
  },
});

export default ProfileScreen;

