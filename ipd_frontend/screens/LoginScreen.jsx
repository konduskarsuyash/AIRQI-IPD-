import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    // Simple validation
    // if (!email.trim()) {
    //   Alert.alert('Error', 'Please enter your email');
    //   return;
    // }
    // if (!password.trim()) {
    //   Alert.alert('Error', 'Please enter your password');
    //   return;
    // }

    // In a real app, you would perform authentication here
    console.log('Logging in with', email, password);
    
    // Navigate to the main app with tab navigation
    navigation.navigate('MainApp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/earth-care.png')}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Please login to get your local AQI data.</Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Image
              source={require('../assets/images/email.png')}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="user@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Image
              source={require('../assets/images/lock.png')}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Image
                source={require('../assets/images/eye.png')}
                style={styles.inputIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rememberContainer}>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity style={styles.checkbox}>
              {/* Add checkbox state and icon here */}
            </TouchableOpacity>
            <Text style={styles.rememberText}>Remember me</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Signup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 8,
  },
  rememberText: {
    fontSize: 14,
    color: '#666666',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666666',
  },
  footerLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default LoginScreen; 