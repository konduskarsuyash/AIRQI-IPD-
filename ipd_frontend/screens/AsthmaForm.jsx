import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AsthmaForm = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [severity, setSeverity] = useState('mild');
  const [symptoms, setSymptoms] = useState([]);
  const [triggerFactors, setTriggerFactors] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [checkupFrequency, setCheckupFrequency] = useState('monthly');
  const [lastAttackDate, setLastAttackDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reportPdf, setReportPdf] = useState(null);
  const [reportPdfName, setReportPdfName] = useState('');
  const [pdfError, setPdfError] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Symptom options
  const symptomOptions = [
    'Wheezing',
    'Coughing',
    'Shortness of breath',
    'Chest tightness',
    'Difficulty breathing',
    'Rapid breathing',
    'Fatigue',
    'Anxiety',
  ];

  // Trigger factor options
  const triggerOptions = [
    'Dust',
    'Pollen',
    'Pet dander',
    'Smoke',
    'Exercise',
    'Cold air',
    'Respiratory infections',
    'Stress',
    'Strong odors',
  ];

  // Allergy options
  const allergyOptions = [
    'Pollen',
    'Dust mites',
    'Pet dander',
    'Mold',
    'Food allergies',
    'Medication allergies',
    'Latex',
  ];

  useEffect(() => {
    checkAsthmaFormStatus();
  }, []);

  const checkAsthmaFormStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@Auth:token');
      
      if (!token) {
        Alert.alert('Error', 'You must be logged in to access this feature');
        navigation.navigate('Login');
        return;
      }

      const response = await api.get('/asthma-form-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.has_submitted) {
        Alert.alert(
          'Form Already Submitted',
          'You have already submitted your asthma information.',
          [{ text: 'OK', onPress: () => navigation.navigate('MainApp') }]
        );
      }
    } catch (error) {
      console.error('Error checking asthma form status:', error);
      Alert.alert('Error', 'Failed to check form status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom) => {
    if (symptoms.includes(symptom)) {
      setSymptoms(symptoms.filter((s) => s !== symptom));
    } else {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const toggleTriggerFactor = (factor) => {
    if (triggerFactors.includes(factor)) {
      setTriggerFactors(triggerFactors.filter((f) => f !== factor));
    } else {
      setTriggerFactors([...triggerFactors, factor]);
    }
  };

  const toggleAllergy = (allergy) => {
    if (allergies.includes(allergy)) {
      setAllergies(allergies.filter((a) => a !== allergy));
    } else {
      setAllergies([...allergies, allergy]);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setLastAttackDate(selectedDate);
    }
  };

  const pickDocument = async () => {
    try {
      console.log('Starting document picker...');
      
      // Use a more specific configuration for PDF files
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      console.log('Document picker result:', result);
      
      // Check if the result has the new format with assets array
      if (result.assets && result.assets.length > 0) {
        const pdfFile = result.assets[0];
        console.log('PDF selected successfully:', pdfFile.name);
        setReportPdf(pdfFile);
        setReportPdfName(pdfFile.name);
        setPdfError(false);
      } else if (result.type === 'success') {
        // Handle the old format
        console.log('PDF selected successfully (old format):', result.name);
        setReportPdf(result);
        setReportPdfName(result.name);
        setPdfError(false);
      } else {
        console.log('Document picker cancelled or failed');
        Alert.alert('Error', 'No PDF file was selected. Please try again.');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        'Error', 
        'Failed to pick document. Please make sure you have a PDF file available and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSubmit = async () => {
    if (symptoms.length === 0) {
      Alert.alert('Error', 'Please select at least one symptom');
      return;
    }

    if (triggerFactors.length === 0) {
      Alert.alert('Error', 'Please select at least one trigger factor');
      return;
    }

    if (!reportPdf) {
      setPdfError(true);
      Alert.alert('Error', 'Please upload your asthma report (PDF)');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('@Auth:token');
      
      if (!token) {
        Alert.alert('Error', 'You must be logged in to submit this form');
        navigation.navigate('Login');
        return;
      }

      console.log('Preparing form data with PDF:', reportPdf);
      
      // Create form data
      const formData = new FormData();
      formData.append('severity', severity);
      formData.append('symptoms', JSON.stringify(symptoms));
      formData.append('trigger_factors', JSON.stringify(triggerFactors));
      formData.append('allergies', JSON.stringify(allergies));
      formData.append('checkup_frequency', checkupFrequency);
      formData.append('last_attack_date', lastAttackDate.toISOString());
      
      // PDF report is compulsory
      formData.append('report_pdf', {
        uri: reportPdf.uri,
        type: 'application/pdf',
        name: reportPdf.name,
      });

      console.log('Submitting form data...');
      
      // Submit form data
      const response = await api.post('/asthma-form', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Form submitted successfully:', response.data);

      Alert.alert(
        'Success',
        'Your asthma information has been submitted successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('MainApp') }]
      );
    } catch (error) {
      console.error('Error submitting asthma form:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      
      Alert.alert(
        'Error', 
        'Failed to submit form. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Custom date picker implementation
  const renderDatePicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setLastAttackDate(tempDate);
                  setShowDatePicker(false);
                }}>
                  <Text style={[styles.datePickerButton, styles.datePickerButtonDone]}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={tempDate}
                onValueChange={(itemValue) => setTempDate(itemValue)}
                style={styles.datePicker}
              >
                {Array.from({ length: 365 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - i);
                  return (
                    <Picker.Item
                      key={date.toISOString()}
                      label={date.toLocaleDateString()}
                      value={date}
                    />
                  );
                })}
              </Picker>
            </View>
          </View>
        </Modal>
      );
    }

    return showDatePicker && (
      <View style={styles.datePickerContainer}>
        <Picker
          selectedValue={tempDate}
          onValueChange={(itemValue) => {
            setLastAttackDate(itemValue);
            setShowDatePicker(false);
          }}
          style={styles.datePicker}
        >
          {Array.from({ length: 365 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return (
              <Picker.Item
                key={date.toISOString()}
                label={date.toLocaleDateString()}
                value={date}
              />
            );
          })}
        </Picker>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Asthma Information Form</Text>
          <Text style={styles.subtitle}>
            Please provide your asthma information to help us personalize your experience.
          </Text>

          {/* Severity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Asthma Severity</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={severity}
                onValueChange={(itemValue) => setSeverity(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Mild" value="mild" />
                <Picker.Item label="Moderate" value="moderate" />
                <Picker.Item label="Severe" value="severe" />
              </Picker>
            </View>
          </View>

          {/* Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symptoms (Select all that apply)</Text>
            <View style={styles.optionsContainer}>
              {symptomOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    symptoms.includes(option) && styles.selectedOption,
                  ]}
                  onPress={() => toggleSymptom(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      symptoms.includes(option) && styles.selectedOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Trigger Factors */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trigger Factors (Select all that apply)</Text>
            <View style={styles.optionsContainer}>
              {triggerOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    triggerFactors.includes(option) && styles.selectedOption,
                  ]}
                  onPress={() => toggleTriggerFactor(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      triggerFactors.includes(option) && styles.selectedOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergies (Select all that apply)</Text>
            <View style={styles.optionsContainer}>
              {allergyOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    allergies.includes(option) && styles.selectedOption,
                  ]}
                  onPress={() => toggleAllergy(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      allergies.includes(option) && styles.selectedOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Checkup Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checkup Frequency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={checkupFrequency}
                onValueChange={(itemValue) => setCheckupFrequency(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Monthly" value="monthly" />
                <Picker.Item label="Every 3 months" value="quarterly" />
                <Picker.Item label="Every 6 months" value="biannually" />
                <Picker.Item label="Annually" value="annually" />
              </Picker>
            </View>
          </View>

          {/* Last Attack Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Asthma Attack Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {lastAttackDate.toDateString()}
              </Text>
            </TouchableOpacity>
            {renderDatePicker()}
          </View>

          {/* Report PDF */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Asthma Report (PDF) *</Text>
            <TouchableOpacity 
              style={[
                styles.uploadButton, 
                pdfError && styles.uploadButtonError
              ]} 
              onPress={pickDocument}
            >
              <Text style={[
                styles.uploadButtonText,
                pdfError && styles.uploadButtonTextError
              ]}>
                {reportPdfName ? reportPdfName : 'Choose PDF File'}
              </Text>
            </TouchableOpacity>
            {pdfError && (
              <Text style={styles.errorText}>PDF report is required</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 56,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#333333',
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  dateButton: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  uploadButton: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  uploadButtonError: {
    borderColor: '#FF3B30',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  uploadButtonTextError: {
    color: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
    shadowColor: '#B0B0B0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  datePickerButton: {
    fontSize: 16,
    color: '#666666',
  },
  datePickerButtonDone: {
    color: '#007AFF',
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
  },
});

export default AsthmaForm; 