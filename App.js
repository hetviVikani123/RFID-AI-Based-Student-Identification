import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Image, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import FaceVerification from './FaceVerification.tsx';

// replace this Url with Original Url
const API_BASE_URL = 'https://app.sc/api1/api/ForDevice';

export default function MainApp() {
  // Device registration state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [imei, setImei] = useState('');
  const [pin, setPin] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Student verification state
  const [cardNumber, setCardNumber] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [isVerified, setIsVerified] = useState(null);
  const [error, setError] = useState('');
  const [showFaceVerification, setShowFaceVerification] = useState(false);

  const logger = (type, message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`, data);
  };

  const checkNetwork = async () => {
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      return true;
    } catch (error) {
      logger('NETWORK', 'No internet connection detected');
      return false;
    }
  };

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      const [storedImei, storedPin] = await AsyncStorage.multiGet(['imei', 'pin']);
      logger('STORAGE', 'Checking stored credentials', { storedImei, storedPin });

      if (storedImei[1] && storedPin[1]) {
        setImei(storedImei[1]);
        setPin(storedPin[1]);
        setIsRegistered(true);
        setShowLogin(false);
        logger('DEVICE', 'Device is already registered');
      } else {
        const deviceId = Device.osInternalBuildId || 'demo-imei-123456';
        setImei(deviceId);
        setShowLogin(true);
        logger('DEVICE', 'Device is not registered');
        await AsyncStorage.multiRemove(['imei', 'pin']);
      }
    } catch (error) {
      logger('ERROR', 'Failed to check registration status', { error });
      Alert.alert('Error', 'Failed to check device registration status');
      setShowLogin(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    logger('AUTH', 'Attempting login', { username });

    try {
      if (!(await checkNetwork())) {
        Alert.alert('No Internet', 'Please check your internet connection');
        return;
      }

      const loginSuccess = true; // Replace with actual API call

      if (loginSuccess) {
        logger('AUTH', 'Login successful');
        await registerDevice();
      } else {
        Alert.alert('Login Failed', 'Invalid username or password');
        logger('AUTH', 'Login failed');
      }
    } catch (error) {
      logger('ERROR', 'Login failed', { error });
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const registerDevice = async () => {
    setIsLoading(true);
    const requestBody = {
      Username: username || "CardTest",
      Password: password || "abcde12345",
      IdentificationNo: imei,
      PhoneName: Device.modelName || 'Unknown Device',
      OS: Device.osName || 'Unknown OS',
      Verson: Device.osVersion || '1.0',
    };

    logger('API', 'Starting device registration', { requestBody });

    try {
      if (!(await checkNetwork())) {
        Alert.alert('No Internet', 'Please check your internet connection');
        return;
      }

      const url = `${API_BASE_URL}/DeviceRegestration`;
      logger('API', 'Sending request to', { url, body: requestBody });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      logger('API', 'Received registration response', data);

      if (data.MessageStatus) {
        const devicePin = String(data.MessageCode);
        await AsyncStorage.multiSet([
          ['pin', devicePin],
          ['imei', imei]
        ]);
        setPin(devicePin);
        setIsRegistered(true);
        setShowLogin(false);
        logger('TERMINAL', 'Device registered successfully. PIN: ${devicePin}');
        Alert.alert('Success', 'Device registered successfully');
      } else {
        Alert.alert('Registration Failed', data.Message || 'Unknown error');
      }
    } catch (error) {
      logger('ERROR', 'Registration failed', { error });
      let errorMessage = 'Registration failed';
      if (error.message.includes('Network')) {
        errorMessage = 'Network error - please check your internet connection';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetails = async () => {
    if (!cardNumber) {
      Alert.alert('Error', 'Please enter a card number');
      return;
    }
    
    setIsLoading(true);
    logger('API', 'Fetching student details', { imei, pin, cardNumber });

    try {
      if (!(await checkNetwork())) {
        Alert.alert('No Internet', 'Please check your internet connection');
        return;
      }

      const url = `${API_BASE_URL}/CardVerify?sIdentificationNo=${imei}&sPinNo=${pin}&lCardNo=${cardNumber}`;
      logger('API', 'Sending request to', { url });

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      logger('API', 'Received student details', data);

      if (data.MessageStatus) {
        setStudentData(data);
        setIsVerified(null);
        setError('');
      } else {
        Alert.alert('Error', data.Message || 'Failed to fetch student details');
      }
    } catch (error) {
      logger('ERROR', 'Failed to fetch student details', { error });
      Alert.alert('Error', 'Failed to fetch student details');
    } finally {
      setIsLoading(false);
    }
  };

  const simulateRFIDScan = () => {
    const randomCardNo = `CARD-${Math.floor(1000 + Math.random() * 9000)}`;
    setCardNumber(randomCardNo);
    logger('RFID', 'Simulated card scan', { cardNumber: randomCardNo });
    Alert.alert('RFID Scan', `Card scanned: ${randomCardNo}`);
  };

  const resetForNewScan = () => {
    setStudentData(null);
    setCardNumber('');
    setIsVerified(null);
    setError('');
    setShowFaceVerification(false);
    logger('FLOW', 'Resetting for new scan');
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      "Study Continue": { backgroundColor: "#4CAF50" },
      "Alumni": { backgroundColor: "#2196F3" },
      "Dropped": { backgroundColor: "#F44336" },
      default: { backgroundColor: "#FF9800" }
    };
    return statusStyles[status] || statusStyles.default;
  };

  const getImageSource = (photoData) => {
    if (!photoData) return null;
    
    if (photoData.startsWith('data:image')) {
      return { uri: photoData };
    }
    
    return { uri: `data:image/jpeg;base64,${photoData}` };
  };

  const handleFaceVerificationComplete = (verificationResult) => {
    if (verificationResult.isVerified) {
      Alert.alert('Success', 'Face verification successful!');
      setIsVerified(true);
      setError('');
    } else {
      Alert.alert('Error', verificationResult.error || 'Face verification failed. Please try again.');
      setIsVerified(false);
      setError(verificationResult.error || 'Verification failed');
    }
    setShowFaceVerification(false);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Animatable.View 
          animation="rotate" 
          iterationCount="infinite" 
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#4CAF50" />
        </Animatable.View>
        <Animatable.Text 
          animation="pulse" 
          iterationCount="infinite" 
          style={styles.loadingText}
        >
          Loading...
        </Animatable.Text>
      </View>
    );
  }

  return (
    <Animatable.View 
      animation="fadeIn" 
      duration={1000} 
      style={styles.mainContainer}
    >
      <StatusBar style="auto" />
      
      {showLogin ? (
        <Animatable.View 
          animation="slideInUp" 
          duration={800} 
          style={styles.container}
        >
          <Animatable.Text 
            animation="bounceIn" 
            style={styles.title}
          >
            Device Registration
          </Animatable.Text>
          
          <Text style={styles.label}>Username:</Text>
          <Animatable.View animation="fadeInLeft" delay={200}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#999"
            />
          </Animatable.View>
          
          <Text style={styles.label}>Password:</Text>
          <Animatable.View animation="fadeInLeft" delay={400}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              placeholderTextColor="#999"
            />
          </Animatable.View>
          
          <Animatable.Text 
            animation="fadeIn" 
            delay={600} 
            style={styles.note}
          >
            Note: This device is not registered. Login to register.
          </Animatable.Text>
          
          <Animatable.View animation="bounceIn" delay={800}>
            <TouchableOpacity 
              style={styles.customButton} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Login & Register Device</Text>
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>
      ) : (
        <Animatable.View 
          animation="slideInUp" 
          duration={800} 
          style={styles.container}
        >
          <Animatable.Text 
            animation="bounceIn" 
            style={styles.title}
          >
            Student Verification
          </Animatable.Text>
          
          <Animatable.Text 
            animation="fadeIn" 
            delay={200} 
            style={styles.subtitle}
          >
            Device IMEI: {imei}
          </Animatable.Text>
          <Animatable.Text 
            animation="fadeIn" 
            delay={400} 
            style={styles.subtitle}
          >
            Device PIN: {pin}
          </Animatable.Text>
          
          {studentData ? (
            <Animatable.View 
              animation="zoomIn" 
              style={styles.studentContainer}
            >
              <View style={[styles.studentCard, getStatusStyle(studentData.Status)]}>
                {studentData.Photo ? (
                  <Animatable.Image 
                    animation="pulse" 
                    source={getImageSource(studentData.Photo)}
                    style={styles.studentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.studentImage, styles.noImage]}>
                    <Text>No Photo</Text>
                  </View>
                )}
                <Animatable.Text 
                  animation="fadeInDown" 
                  style={styles.studentName}
                >
                  {studentData.StudentName}
                </Animatable.Text>
                <Text>Enrollment: {studentData.EnrollmentNo}</Text>
                <Text>Status: {studentData.CurrentStatus}</Text>
                <Text>Parent Mobile: {studentData.ParentMobileNo}</Text>
              </View>
              
              {!showFaceVerification && (
                <Animatable.View animation="bounceIn" delay={200}>
                  <TouchableOpacity 
                    style={styles.customButton}
                    onPress={() => setShowFaceVerification(true)}
                  >
                    <Text style={styles.buttonText}>Start Face Verification</Text>
                  </TouchableOpacity>
                </Animatable.View>
              )}
              
              {showFaceVerification && (
                <FaceVerification
                  storedPhoto={studentData.Photo}
                  onVerificationComplete={handleFaceVerificationComplete}
                  onCancel={() => setShowFaceVerification(false)}
                />
              )}
              
              {isVerified !== null && (
                <Animatable.View 
                  animation={isVerified ? "tada" : "shake"} 
                  style={styles.verificationStatus}
                >
                  {isVerified ? (
                    <Text style={styles.verificationSuccess}>✅ Student Verified Successfully!</Text>
                  ) : (
                    <Text style={styles.verificationError}>❌ Verification Failed: Faces don't match</Text>
                  )}
                </Animatable.View>
              )}
              
              {error ? (
                <Animatable.Text 
                  animation="shake" 
                  style={styles.errorText}
                >
                  {error}
                </Animatable.Text>
              ) : null}
              
              <Animatable.View animation="bounceIn" delay={400}>
                <TouchableOpacity 
                  style={styles.customButton}
                  onPress={resetForNewScan}
                >
                  <Text style={styles.buttonText}>Scan Another Card</Text>
                </TouchableOpacity>
              </Animatable.View>
            </Animatable.View>
          ) : (
            <>
              <Text style={styles.label}>Card Number:</Text>
              <Animatable.View animation="fadeInLeft" delay={200}>
                <TextInput
                  style={styles.input}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="Enter card number or scan"
                  placeholderTextColor="#999"
                />
              </Animatable.View>
              
              <Animatable.View 
                animation="fadeInUp" 
                delay={400} 
                style={styles.buttonGroup}
              >
                <TouchableOpacity 
                  style={styles.customButton}
                  onPress={simulateRFIDScan}
                >
                  <Text style={styles.buttonText}>Scan ID Card</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.customButton, !cardNumber && styles.disabledButton]}
                  onPress={fetchStudentDetails}
                  disabled={!cardNumber || isLoading}
                >
                  <Text style={styles.buttonText}>Fetch Details</Text>
                </TouchableOpacity>
              </Animatable.View>
            </>
          )}
        </Animatable.View>
      )}
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e8efff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#0f1c3f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8efff',
  },
  loadingContainer: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#0077b6',
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#023e8a',
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    color: '#5e6472',
    fontStyle: 'italic',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#1a2c4d',
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#f77f00',
    fontStyle: 'italic',
  },
  input: {
    height: 50,
    borderColor: '#b0c4de',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonGroup: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  customButton: {
    backgroundColor: '#0096c7',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  studentContainer: {
    flex: 1,
  },
  studentCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  studentImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  noImage: {
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1e3a8a',
  },
  verificationStatus: {
    marginVertical: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  verificationSuccess: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 18,
  },
  verificationError: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 18,
  },
  errorText: {
    color: '#d63031',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
});
