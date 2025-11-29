import BackgroundService from 'react-native-background-actions';
import {Platform} from 'react-native';

const sleep = time =>
  new Promise(resolve => setTimeout(() => resolve(), time));

class BackgroundMonitoringService {
  constructor() {
    this.isRunning = false;
    this.onAccidentDetected = null;
    this.sensorCallback = null;
  }

  async start(sensorCallback, onAccidentDetected) {
    if (this.isRunning) {
      console.log('⚠️ Background service already running');
      return;
    }

    this.sensorCallback = sensorCallback;
    this.onAccidentDetected = onAccidentDetected;

    const options = {
      taskName: 'AccidentMonitoring',
      taskTitle: '🚗 Accident Detection Active',
      taskDesc: 'Monitoring for accidents in background',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff0000',
      linkingURI: 'accidentdetection://monitoring',
      parameters: {
        delay: 50, // Run every 50ms (20Hz)
      },
    };

    try {
      await BackgroundService.start(this.backgroundTask, options);
      this.isRunning = true;
      console.log('✅ Background monitoring started');
    } catch (error) {
      console.error('❌ Failed to start background service:', error);
      throw error;
    }
  }

  backgroundTask = async taskDataArguments => {
    const {delay} = taskDataArguments;

    await new Promise(async resolve => {
      // Infinite loop for background monitoring
      for (let i = 0; BackgroundService.isRunning(); i++) {
        // Call sensor callback if provided
        if (this.sensorCallback) {
          try {
            await this.sensorCallback();
          } catch (error) {
            console.error('Sensor callback error:', error);
          }
        }

        // Update notification every 10 seconds
        if (i % 200 === 0) {
          await BackgroundService.updateNotification({
            taskDesc: `Monitoring... (${Math.floor(i / 20)}s)`,
          });
        }

        await sleep(delay);
      }
    });
  };

  async stop() {
    try {
      await BackgroundService.stop();
      this.isRunning = false;
      console.log('✅ Background monitoring stopped');
    } catch (error) {
      console.error('❌ Failed to stop background service:', error);
    }
  }

  async updateNotification(title, desc) {
    if (this.isRunning) {
      try {
        await BackgroundService.updateNotification({
          taskTitle: title,
          taskDesc: desc,
        });
      } catch (error) {
        console.error('Failed to update notification:', error);
      }
    }
  }
}

export default new BackgroundMonitoringService();