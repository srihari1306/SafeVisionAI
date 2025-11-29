// import {Linking, Platform} from 'react-native';
// import SendSMS from 'react-native-sms';

// class SMSService {
//   BACKEND_API_URL = 'https://temp-week-cia-animation.trycloudflare.com/api/mobile/report';
//   STATIC_ACCIDENT_DATA = {
//     user_id: 'RN_ACCIDENT_USER_42', // Static User ID placeholder
//     acc_peak: 10.5, // Placeholder G-force peak (e.g., severe accident)
//     gyro_peak: 12.0, // Placeholder Gyro peak
//     sensor_data: JSON.stringify({
//       version: 1,
//       source: 'RN_App',
//       event_type: 'CRASH_DETECTED',
//       g_force_vector: [0.1, 9.8, 0.2],
//     }), // Placeholder JSON string of raw sensor data
//   };

//   async sendEmergencySMS(phoneNumber, location, speed, timestamp) {
//     try {
//       const message = this.formatEmergencyMessage(
//         location,
//         speed,
//         timestamp,
//       );

//       if (Platform.OS === 'android') {
//         // Android - use SMS intent
//         await this.sendViaSMSIntent(phoneNumber, message);
//       } else {
//         // iOS - use URL scheme
//         await this.sendViaSMSURL(phoneNumber, message);
//       }

//       console.log('✅ Emergency SMS sent to:', phoneNumber);
//       return true;
//     } catch (error) {
//       console.error('❌ SMS sending failed:', error);
//       // Fallback to manual SMS
//       await this.openSMSApp(phoneNumber, message);
//       return false;
//     }
//   }

//   formatEmergencyMessage(location, speed, timestamp) {
//     const {latitude, longitude} = location || {
//       latitude: 0,
//       longitude: 0,
//     };
//     const googleMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
//     const time = new Date(timestamp).toLocaleTimeString();

//     return `🚨 ACCIDENT DETECTED 🚨

// Location: ${googleMapsLink}
// Time: ${time}
// Speed: ${speed.toFixed(1)} km/h
// Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}

// Please check on me immediately!

// - Sent by Accident Detection App`;
//   }

//   async sendViaSMSIntent(phoneNumber, message) {
//     try {
//       await SendSMS.send(
//         {
//           body: message,
//           recipients: [phoneNumber],
//           successTypes: ['sent', 'queued'],
//         },
//         (completed, cancelled, error) => {
//           if (completed) {
//             console.log('SMS sent successfully');
//           } else if (cancelled) {
//             console.log('SMS cancelled');
//           } else if (error) {
//             console.error('SMS error:', error);
//           }
//         },
//       );
//     } catch (error) {
//       console.error('SendSMS error:', error);
//       throw error;
//     }
//   }

//   async sendViaSMSURL(phoneNumber, message) {
//     try {
//       const url = `sms:${phoneNumber}${
//         Platform.OS === 'ios' ? '&' : '?'
//       }body=${encodeURIComponent(message)}`;

//       const canOpen = await Linking.canOpenURL(url);
//       if (canOpen) {
//         await Linking.openURL(url);
//       } else {
//         throw new Error('Cannot open SMS');
//       }
//     } catch (error) {
//       console.error('SMS URL error:', error);
//       throw error;
//     }
//   }

//   async openSMSApp(phoneNumber, message) {
//     try {
//       const url = `sms:${phoneNumber}${
//         Platform.OS === 'ios' ? '&' : '?'
//       }body=${encodeURIComponent(message)}`;
//       await Linking.openURL(url);
//     } catch (error) {
//       console.error('Cannot open SMS app:', error);
//     }
//   }

//   async sendToMultipleContacts(contacts, location, speed, timestamp) {
//     const results = [];
//     for (const contact of contacts) {
//       try {
//         const success = await this.sendEmergencySMS(
//           contact.phone,
//           location,
//           speed,
//           timestamp,
//         );
//         results.push({contact, success});
//       } catch (error) {
//         results.push({contact, success: false, error});
//       }
//     }
//     return results;
//   }

//   async reportAccidentToServer(location, speed, timestamp) {
//     const {latitude, longitude} = location || {
//       latitude: 0,
//       longitude: 0,
//     };
    
//     // Use FormData for multipart/form-data required by the Flask route
//     const formData = new FormData();

//     // 1. Mandatory Data from sensor event (used in SMS)
//     formData.append('lat', latitude.toFixed(6));
//     formData.append('lng', longitude.toFixed(6));
//     // The timestamp should be an ISO datetime string for consistent parsing
//     formData.append('timestamp', new Date(timestamp).toISOString()); 
//     formData.append('speed', speed.toFixed(2));
    
//     // 2. Static/Placeholder Data (as requested by user)
//     formData.append('user_id', this.STATIC_ACCIDENT_DATA.user_id);
//     formData.append('acc_peak', this.STATIC_ACCIDENT_DATA.acc_peak.toString());
//     formData.append('gyro_peak', this.STATIC_ACCIDENT_DATA.gyro_peak.toString());
//     formData.append('sensor_data', this.STATIC_ACCIDENT_DATA.sensor_data);
    
//     try {
//       console.log('📡 Reporting accident to server:', this.BACKEND_API_URL);
//       const response = await fetch(this.BACKEND_API_URL, {
//         method: 'POST',
//         // Note: For FormData, 'Content-Type': 'multipart/form-data' is usually set automatically
//         body: formData,
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         console.error('❌ Server report failed (Status:', response.status, '):', result);
//         throw new Error(result.error || 'Server error occurred during report.');
//       }

//       console.log('✅ Server report successful. Incident ID:', result.incident_id);
//       return { success: true, incidentId: result.incident_id };

//     } catch (error) {
//       console.error('❌ API call failed:', error.message);
//       return { success: false, error: error.message };
//     }
//   }
// }

// export default new SMSService();

import { Linking, Platform } from 'react-native';
import SendSMS from 'react-native-sms';

class SMSService {

  // Use your Cloudflare Tunnel endpoint
  BACKEND_API_URL = 'https://temp-week-cia-animation.trycloudflare.com/api/mobile/report';

  STATIC_ACCIDENT_DATA = {
    user_id: 'RN_ACCIDENT_USER_42',
    acc_peak: 10.5,
    gyro_peak: 12.0,
    sensor_data: JSON.stringify({
      version: 1,
      source: 'RN_App',
      event_type: 'CRASH_DETECTED',
      g_force_vector: [0.1, 9.8, 0.2],
    }),
  };

  async sendEmergencySMS(phoneNumber, location, speed, timestamp) {
    try {
      const message = this.formatEmergencyMessage(location, speed, timestamp);

      if (Platform.OS === 'android') {
        await this.sendViaSMSIntent(phoneNumber, message);
      } else {
        await this.sendViaSMSURL(phoneNumber, message);
      }

      console.log('✅ Emergency SMS sent to:', phoneNumber);
      return true;
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      await this.openSMSApp(phoneNumber, message);
      return false;
    }
  }

  formatEmergencyMessage(location, speed, timestamp) {
    const { latitude, longitude } = location || { latitude: 0, longitude: 0 };
    const googleMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const time = new Date(timestamp).toLocaleTimeString();

    return `🚨 ACCIDENT DETECTED 🚨

Location: ${googleMapsLink}
Time: ${time}
Speed: ${speed.toFixed(1)} km/h
Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}

Please check on me immediately!

- Sent by Accident Detection App`;
  }

  async sendViaSMSIntent(phoneNumber, message) {
    try {
      await SendSMS.send(
        {
          body: message,
          recipients: [phoneNumber],
          successTypes: ['sent', 'queued'],
        },
        (completed, cancelled, error) => {
          if (completed) console.log('SMS sent successfully');
          else if (cancelled) console.log('SMS cancelled');
          else if (error) console.error('SMS error:', error);
        }
      );
    } catch (error) {
      console.error('SendSMS error:', error);
      throw error;
    }
  }

  async sendViaSMSURL(phoneNumber, message) {
    try {
      const url = `sms:${phoneNumber}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) await Linking.openURL(url);
      else throw new Error('Cannot open SMS');
    } catch (error) {
      console.error('SMS URL error:', error);
      throw error;
    }
  }

  async openSMSApp(phoneNumber, message) {
    try {
      const url = `sms:${phoneNumber}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
    } catch (error) {
      console.error('Cannot open SMS app:', error);
    }
  }

  async sendToMultipleContacts(contacts, location, speed, timestamp) {
    const results = [];
    for (const contact of contacts) {
      try {
        const success = await this.sendEmergencySMS(contact.phone, location, speed, timestamp);
        results.push({ contact, success });
      } catch (error) {
        results.push({ contact, success: false, error });
      }
    }
    return results;
  }

  async reportAccidentToServer(location, speed, timestamp) {

    const { latitude, longitude } = location || { latitude: 0, longitude: 0 };

    const formData = new FormData();

    // Convert EVERYTHING to string (iOS Requirement)
    formData.append('lat', String(latitude.toFixed(6)));
    formData.append('lng', String(longitude.toFixed(6)));
    formData.append('timestamp', String(new Date(timestamp).toISOString()));
    formData.append('speed', String(speed.toFixed(2)));

    formData.append('user_id', String(this.STATIC_ACCIDENT_DATA.user_id));
    formData.append('acc_peak', String(this.STATIC_ACCIDENT_DATA.acc_peak));
    formData.append('gyro_peak', String(this.STATIC_ACCIDENT_DATA.gyro_peak));
    formData.append('sensor_data', String(this.STATIC_ACCIDENT_DATA.sensor_data));

    try {
      console.log('📡 Reporting accident to server:', this.BACKEND_API_URL);

      const response = await fetch(this.BACKEND_API_URL, {
        method: 'POST',
        headers: {
          "Content-Type": "multipart/form-data",
          "Accept": "application/json"
        },
        body: formData,
      });

      let resultText = await response.text();
      let result = {};
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        console.log("Response not JSON:", resultText);
      }

      if (!response.ok) {
        console.error(`❌ Server error ${response.status}:`, result);
        throw new Error(result.error || "Server error");
      }

      console.log('✅ Server report successful. Incident ID:', result.incident_id);
      return { success: true, incidentId: result.incident_id };

    } catch (error) {
      console.error('❌ API call failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new SMSService();
