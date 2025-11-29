import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
  Animated,
  Dimensions,
} from 'react-native';
import {
  accelerometer,
  gyroscope,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import Geolocation from '@react-native-community/geolocation';
import TFLiteService from './src/services/TFLiteService';
import ContactsService from './src/services/ContactsService';
import SMSService from './src/services/SMSService';
import BackgroundService from './src/services/BackgroundService';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';

const {width} = Dimensions.get('window');

const CONFIG = {
  SERVER_URL: 'https://papua-xcitem.trycloudflare.com',
  TIMESTEPS: 150,
  FEATURES: 7,
  SAMPLING_RATE: 20,
  ACCIDENT_THRESHOLD: 0.5,
  ALERT_DURATION: 10,
  EMERGENCY_NUMBER: '108',
};

interface SensorData {
  timestamp: number;
  accel: {x: number; y: number; z: number};
  gyro: {x: number; y: number; z: number};
}

function App(): React.JSX.Element {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [showAccidentModal, setShowAccidentModal] = useState(false);
  const [showContactsScreen, setShowContactsScreen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [countdown, setCountdown] = useState(CONFIG.ALERT_DURATION);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [backgroundMode, setBackgroundMode] = useState(false);
  
  // G-Force tracking
  const [currentGForce, setCurrentGForce] = useState(0);
  const [maxGForce, setMaxGForce] = useState(0);
  const [gyroIntensity, setGyroIntensity] = useState(0);

  const sensorDataBuffer = useRef<SensorData[]>([]);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const accelerometerSub = useRef<any>(null);
  const gyroscopeSub = useRef<any>(null);
  const lastAccidentData = useRef<number[][] | null>(null);
  const locationWatchId = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const gForceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    initializeApp();
    requestPermissions();
    loadEmergencyContacts();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cleanup();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isMonitoring]);

  // G-Force warning animation
  useEffect(() => {
    if (currentGForce > 15) {
      Animated.sequence([
        Animated.timing(gForceAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(gForceAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentGForce]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App has come to the foreground!');
    }

    if (
      appState.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log('App has gone to background');
      if (isMonitoring && !backgroundMode) {
        startBackgroundMonitoring();
      }
    }

    appState.current = nextAppState;
  };

  const loadEmergencyContacts = async () => {
    const contacts = await ContactsService.getEmergencyContacts();
    setEmergencyContacts(contacts);
  };

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          PermissionsAndroid.PERMISSIONS.BODY_SENSORS,
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        ]);

        console.log('Permissions:', granted);
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const initializeApp = async () => {
    try {
      setStatus('Loading model...');

      const result = await TFLiteService.initialize();

      if (result.success) {
        setModelInfo(result);
        setStatus('Ready');
        Alert.alert(
          'System Ready',
          `Accident detection initialized\n\n• ${result.backend} backend\n• Offline capable\n• Fast inference`,
        );
      } else {
        setStatus('Error');
        Alert.alert('Error', `Failed to load model:\n${result.error}`);
      }
    } catch (error: any) {
      console.error('Initialization error:', error);
      setStatus('Failed');
    }
  };

  const cleanup = () => {
    if (accelerometerSub.current) {
      accelerometerSub.current.unsubscribe();
    }
    if (gyroscopeSub.current) {
      gyroscopeSub.current.unsubscribe();
    }
    if (locationWatchId.current !== null) {
      Geolocation.clearWatch(locationWatchId.current);
    }
    if (backgroundMode) {
      BackgroundService.stop();
    }
    TFLiteService.dispose();
  };

  const calculateGForce = (x: number, y: number, z: number): number => {
    
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    return magnitude / 9.8;
  };

  const calculateGyroIntensity = (x: number, y: number, z: number): number => {
    
    return Math.sqrt(x * x + y * y + z * z) * (180 / Math.PI);
  };

  const startMonitoring = async () => {
    if (!TFLiteService.isReady) {
      Alert.alert('Error', 'Model not loaded yet. Please wait.');
      return;
    }

    if (emergencyContacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts first',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Add Contacts',
            onPress: () => setShowContactsScreen(true),
          },
        ],
      );
      return;
    }

    setIsMonitoring(true);
    setStatus('Monitoring');
    sensorDataBuffer.current = [];
    setMaxGForce(0);

    setUpdateIntervalForType(
      SensorTypes.accelerometer,
      1000 / CONFIG.SAMPLING_RATE,
    );
    setUpdateIntervalForType(SensorTypes.gyroscope, 1000 / CONFIG.SAMPLING_RATE);

    accelerometerSub.current = accelerometer.subscribe(({x, y, z}) => {
      const gForce = calculateGForce(x, y, z);
      setCurrentGForce(gForce);
      if (gForce > maxGForce) {
        setMaxGForce(gForce);
      }
      handleSensorData({x, y, z}, 'accel');
    });

    gyroscopeSub.current = gyroscope.subscribe(({x, y, z}) => {
      const intensity = calculateGyroIntensity(x, y, z);
      setGyroIntensity(intensity);
      handleSensorData({x, y, z}, 'gyro');
    });

    locationWatchId.current = Geolocation.watchPosition(
      position => {
        setCurrentLocation(position.coords);
        if (position.coords.speed) {
          setCurrentSpeed(position.coords.speed * 3.6);
        }
      },
      error => console.log('Location error:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 1,
        interval: 1000,
      },
    );
  };

  const startBackgroundMonitoring = async () => {
    try {
      setBackgroundMode(true);
      await BackgroundService.start(
        async () => {},
        handleAccidentDetectedInBackground,
      );
      console.log('Background monitoring started');
    } catch (error) {
      console.error('Failed to start background monitoring:', error);
      setBackgroundMode(false);
    }
  };

  const handleAccidentDetectedInBackground = async () => {
    console.log('Accident detected in background!');
  };

  const stopMonitoring = () => {
    if (accelerometerSub.current) {
      accelerometerSub.current.unsubscribe();
      accelerometerSub.current = null;
    }
    if (gyroscopeSub.current) {
      gyroscopeSub.current.unsubscribe();
      gyroscopeSub.current = null;
    }
    if (locationWatchId.current !== null) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    if (backgroundMode) {
      BackgroundService.stop();
      setBackgroundMode(false);
    }

    setIsMonitoring(false);
    setStatus('Ready');
    sensorDataBuffer.current = [];
    setCurrentSpeed(0);
    setCurrentGForce(0);
    setGyroIntensity(0);
  };

  const handleSensorData = (
    data: {x: number; y: number; z: number},
    type: 'accel' | 'gyro',
  ) => {
    const timestamp = Date.now();

    let entry = sensorDataBuffer.current.find(
      e => Math.abs(e.timestamp - timestamp) < 25,
    );

    if (!entry) {
      entry = {
        timestamp,
        accel: {x: 0, y: 0, z: 0},
        gyro: {x: 0, y: 0, z: 0},
      };
      sensorDataBuffer.current.push(entry);
    }

    if (type === 'accel') {
      entry.accel = data;
    } else {
      entry.gyro = data;
    }

    if (sensorDataBuffer.current.length > CONFIG.TIMESTEPS) {
      sensorDataBuffer.current.shift();
    }

    if (
      sensorDataBuffer.current.length === CONFIG.TIMESTEPS &&
      !isProcessing
    ) {
      processData();
    }
  };

  const processData = async () => {
    setIsProcessing(true);

    try {
      const formattedData = sensorDataBuffer.current.map(entry => [
        entry.accel.x || 0,
        entry.accel.y || 0,
        entry.accel.z || 0,
        entry.gyro.x || 0,
        entry.gyro.y || 0,
        entry.gyro.z || 0,
        currentSpeed || 0,
      ]);

      const startTime = Date.now();
      const prediction = await TFLiteService.predict(formattedData);
      const elapsed = Date.now() - startTime;

      setInferenceTime(elapsed);

      console.log(`🎯 Prediction: ${prediction.toFixed(4)} (${elapsed}ms) | G-Force: ${maxGForce.toFixed(2)}G | Gyro: ${gyroIntensity.toFixed(1)}°/s`);

      if (prediction > CONFIG.ACCIDENT_THRESHOLD) {
        console.log('🚨 ACCIDENT DETECTED!');
        lastAccidentData.current = formattedData;
        triggerAccidentAlert();
      }
    } catch (error: any) {
      console.error('Inference error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerAccidentAlert = () => {
    stopMonitoring();
    setShowAccidentModal(true);
    setCountdown(CONFIG.ALERT_DURATION);

    sendEmergencySMS();

    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleAutoCallEmergency();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendEmergencySMS = async () => {
    try {
      console.log('📱 Sending emergency SMS...');

      const serverReport = await SMSService.reportAccidentToServer(
        currentLocation,
        currentSpeed,
        Date.now()
      )
      console.log("Report sent to dashboard")
      const results = await SMSService.sendToMultipleContacts(
        emergencyContacts,
        currentLocation,
        currentSpeed,
        Date.now(),
      );

      console.log('✅ SMS sent to', results.length, 'contacts');

      if (results.some(r => r.success)) {
        Alert.alert(
          'Emergency SMS Sent',
          `Notified ${results.filter(r => r.success).length} emergency contacts`,
        );
      }
    } catch (error) {
      console.error('Failed to send emergency SMS:', error);
    }
  };

  const handleImOk = async () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    setShowAccidentModal(false);

    Alert.alert(
      'False Alarm',
      'Glad you\'re okay! This helps improve detection.',
      [{text: 'OK', onPress: () => setStatus('Ready')}],
    );
  };

  const handleCallEmergency = async () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    setShowAccidentModal(false);

    const primaryContact = await ContactsService.getPrimaryContact();
    const phoneNumber = primaryContact?.phone || CONFIG.EMERGENCY_NUMBER;
    const contactName = primaryContact?.name || 'Emergency Services';

    const url =
      Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

    Alert.alert(
      'Call Emergency Contact',
      `Calling ${contactName} (${phoneNumber})`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Call Now',
          onPress: async () => {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            }
          },
        },
      ],
    );
  };

  const handleAutoCallEmergency = async () => {
    const primaryContact = await ContactsService.getPrimaryContact();
    const contactName = primaryContact?.name || 'Emergency Services';

    Alert.alert(
      'Auto-Calling Emergency',
      `No response. Calling ${contactName}...`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowAccidentModal(false),
        },
        {text: 'Call', onPress: handleCallEmergency},
      ],
    );
  };

  const handleViewMedicalInfo = async () => {
    const medicalInfo = await ContactsService.getMedicalInfo();

    let infoText = 'MEDICAL INFORMATION\n\n';
    if (medicalInfo.bloodType)
      infoText += `Blood Type: ${medicalInfo.bloodType}\n`;
    if (medicalInfo.allergies)
      infoText += `Allergies: ${medicalInfo.allergies}\n`;
    if (medicalInfo.medications)
      infoText += `Medications: ${medicalInfo.medications}\n`;
    if (medicalInfo.conditions)
      infoText += `Conditions: ${medicalInfo.conditions}\n`;
    if (medicalInfo.insuranceInfo)
      infoText += `Insurance: ${medicalInfo.insuranceInfo}\n`;

    if (
      !medicalInfo.bloodType &&
      !medicalInfo.allergies &&
      !medicalInfo.medications
    ) {
      infoText = 'No medical information configured.\n\nPlease add in Emergency Contacts screen.';
    }

    Alert.alert('Medical Information', infoText);
  };

  const getGForceColor = (gForce: number): string => {
    if (gForce < 2) return '#34C759'; 
    if (gForce < 5) return '#FFD60A'; 
    if (gForce < 15) return '#FF9500'; 
    return '#FF3B30'; 
  };

  const getGForceLabel = (gForce: number): string => {
    if (gForce < 2) return 'NORMAL';
    if (gForce < 5) return 'MODERATE';
    if (gForce < 15) return 'HIGH';
    return 'DANGER';
  };

  if (showContactsScreen) {
    return (
      <EmergencyContactsScreen
        navigation={{
          goBack: () => {
            setShowContactsScreen(false);
            loadEmergencyContacts();
          },
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Guardian</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isMonitoring
                    ? '#FF3B30'
                    : TFLiteService.isReady
                    ? '#34C759'
                    : '#8E8E93',
                },
              ]}
            />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {/* Main Status Circle */}
        <Animated.View
          style={[
            styles.statusCircle,
            {
              transform: [{scale: scaleAnim}, {scale: pulseAnim}],
            },
          ]}>
          <View
            style={[
              styles.statusCircleInner,
              isMonitoring && styles.statusCircleActive,
            ]}>
            <Text style={styles.statusIcon}>
              {isMonitoring ? '●' : TFLiteService.isReady ? '●' : '○'}
            </Text>
            <Text style={styles.statusLabel}>
              {isMonitoring ? 'ACTIVE' : TFLiteService.isReady ? 'READY' : 'LOADING'}
            </Text>
          </View>
        </Animated.View>

        {/* Live Stats - Enhanced with G-Force */}
        {isMonitoring && (
          <Animated.View style={[styles.statsContainer, {opacity: fadeAnim}]}>
            {/* G-Force Display - Prominent */}
            <View style={styles.gForceCard}>
              <Text style={[styles.gForceValue, {color: getGForceColor(currentGForce)}]}>
                {currentGForce.toFixed(2)}
              </Text>
              <Text style={styles.gForceUnit}>G-FORCE</Text>
              <Text style={[styles.gForceStatus, {color: getGForceColor(currentGForce)}]}>
                {getGForceLabel(currentGForce)}
              </Text>
              <Text style={styles.gForceMax}>
                Peak: {maxGForce.toFixed(2)}G
              </Text>
            </View>

            {/* Other Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentSpeed.toFixed(0)}</Text>
                <Text style={styles.statLabel}>km/h</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {gyroIntensity.toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>°/s</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {currentLocation ? '●' : '○'}
                </Text>
                <Text style={styles.statLabel}>GPS</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Main Action Button */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            isMonitoring && styles.mainButtonActive,
            !TFLiteService.isReady && styles.mainButtonDisabled,
          ]}
          onPress={isMonitoring ? stopMonitoring : startMonitoring}
          disabled={!TFLiteService.isReady}
          activeOpacity={0.7}>
          <Text style={styles.mainButtonText}>
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowContactsScreen(true)}>
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionText}>
              Contacts {emergencyContacts.length > 0 && `(${emergencyContacts.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleViewMedicalInfo}>
            <Text style={styles.quickActionIcon}>💊</Text>
            <Text style={styles.quickActionText}>Medical</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowInfoModal(true)}>
            <Text style={styles.quickActionIcon}>ℹ️</Text>
            <Text style={styles.quickActionText}>Info</Text>
          </TouchableOpacity>
        </View>

        {/* Test Button */}
        {TFLiteService.isReady && !isMonitoring && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              lastAccidentData.current = [[0, 0, 0, 0, 0, 0, 0]];
              triggerAccidentAlert();
            }}>
            <Text style={styles.testButtonText}>Test Alert</Text>
          </TouchableOpacity>
        )}

        {/* Footer Info */}
        <View style={styles.footer}>
          {backgroundMode && (
            <Text style={styles.footerBadge}>Background Active</Text>
          )}
          <Text style={styles.footerText}>
            Offline capable • {sensorDataBuffer.current.length}/{CONFIG.TIMESTEPS} buffer
          </Text>
          {inferenceTime > 0 && (
            <Text style={styles.footerText}>
              Inference: {inferenceTime}ms
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Info Modal - Alert Conditions */}
      <Modal visible={showInfoModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            <Text style={styles.infoModalTitle}>🚨 Alert Conditions</Text>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>When will alert trigger?</Text>
              
              <View style={styles.conditionItem}>
                <Text style={styles.conditionIcon}>🎯</Text>
                <View style={styles.conditionText}>
                  <Text style={styles.conditionTitle}>Pattern 1: Severe Crash</Text>
                  <Text style={styles.conditionDesc}>
                    • Acceleration spike {'>'} 25 G{'\n'}
                    • Rotation {'>'} 400°/s{'\n'}
                    • Speed drop {'>'} 15 km/h{'\n'}
                    <Text style={styles.conditionScore}>Score: +0.7</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <Text style={styles.conditionIcon}>🛑</Text>
                <View style={styles.conditionText}>
                  <Text style={styles.conditionTitle}>Pattern 2: Hard Brake</Text>
                  <Text style={styles.conditionDesc}>
                    • Sustained deceleration {'>'} 1.5 G{'\n'}
                    • Duration {'>'} 30 samples (1.5s){'\n'}
                    <Text style={styles.conditionScore}>Score: +0.2</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <Text style={styles.conditionIcon}>📱</Text>
                <View style={styles.conditionText}>
                  <Text style={styles.conditionTitle}>Pattern 3: Phone Drop (Filtered)</Text>
                  <Text style={styles.conditionDesc}>
                    • Impact {'>'} 15 G + High rotation{'\n'}
                    • Filtered OUT (not a crash){'\n'}
                    <Text style={styles.conditionScore}>Score: -0.3</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <Text style={styles.conditionIcon}>🕳️</Text>
                <View style={styles.conditionText}>
                  <Text style={styles.conditionTitle}>Pattern 4: Pothole (Filtered)</Text>
                  <Text style={styles.conditionDesc}>
                    • Z-axis spike {'>'} 3 G{'\n'}
                    • Quick recovery detected{'\n'}
                    <Text style={styles.conditionScore}>Score: -0.2</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <Text style={styles.conditionIcon}>🛑</Text>
                <View style={styles.conditionText}>
                  <Text style={styles.conditionTitle}>Pattern 5: Post-Impact</Text>
                  <Text style={styles.conditionDesc}>
                    • Vehicle stillness {'>'} 80%{'\n'}
                    • After significant impact{'\n'}
                    <Text style={styles.conditionScore}>Score: +0.2</Text>
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Alert Threshold</Text>
              <Text style={styles.thresholdText}>
                Total Score {'>'} 0.5 = 🚨 ALERT TRIGGERED
              </Text>
            </View>

            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={() => setShowInfoModal(false)}>
              <Text style={styles.infoModalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Accident Alert Modal */}
      <Modal visible={showAccidentModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.alertPulse}>
                <Text style={styles.alertIcon}>⚠️</Text>
              </View>
              <Text style={styles.modalTitle}>Accident Detected</Text>
              <Text style={styles.modalSubtitle}>Are you okay?</Text>
              <Text style={styles.modalImpact}>
                Impact: {maxGForce.toFixed(1)}G
              </Text>
            </View>

            <View style={styles.countdownContainer}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownLabel}>seconds</Text>
            </View>

            <Text style={styles.modalInfo}>
              Emergency contacts have been notified
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleImOk}>
                  <Text style={styles.modalButtonTextPrimary}>I'm OK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={handleCallEmergency}>
                <Text style={styles.modalButtonTextSecondary}>Call Emergency</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonTertiary}
                onPress={handleViewMedicalInfo}>
                <Text style={styles.modalButtonTextTertiary}>Medical Info</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusCircle: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  statusCircleInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCircleActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  statusIcon: {
    fontSize: 48,
    color: '#34C759',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 2,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  gForceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gForceValue: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
  },
  gForceUnit: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 4,
  },
  gForceStatus: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 8,
  },
  gForceMax: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
  },
  mainButton: {
    marginHorizontal: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#34C759',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  mainButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  mainButtonDisabled: {
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    shadowOpacity: 0,
  },
  mainButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
  },
  testButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerBadge: {
    fontSize: 12,
    color: '#9B59B6',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  alertPulse: {
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 56,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalImpact: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 8,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 4,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalInfo: {
    fontSize: 14,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  modalActions: {
    gap: 12,
  },
  modalButtonPrimary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonTextPrimary: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  modalButtonSecondary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonTextSecondary: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  modalButtonTertiary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalButtonTextTertiary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  infoModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  conditionItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  conditionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  conditionText: {
    flex: 1,
  },
  conditionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 6,
  },
  conditionDesc: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
  },
  conditionScore: {
    color: '#34C759',
    fontWeight: '600',
  },
  thresholdText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  infoModalButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  infoModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default App;
                