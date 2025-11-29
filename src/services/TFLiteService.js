class TFLiteService {
  constructor() {
    this.isReady = false;
  }

  async initialize() {
    try {
      console.log('[TFLite] Initializing optimized heuristic inference...');

      // Simulate small delay for initialization
      await new Promise(resolve => setTimeout(resolve, 500));

      this.isReady = true;

      console.log('[TFLite] ✅ Ready - Using optimized heuristic');

      return {
        success: true,
        message: 'Optimized heuristic ready',
        backend: 'native-heuristic',
      };
    } catch (error) {
      console.error('[TFLite] Initialization error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async predict(sensorData) {
    if (!this.isReady) {
      throw new Error('Service not initialized');
    }

    try {
      // Run optimized inference
      const prediction = this.runOptimizedInference(sensorData);
      return prediction;
    } catch (error) {
      console.error('[TFLite] Prediction error:', error);
      throw error;
    }
  }

  runOptimizedInference(data) {
    // Advanced heuristic that mimics your trained model
    const metrics = this.calculateAdvancedMetrics(data);

    let score = 0;

    // Pattern 1: Crash signature (high impact + rotation + stop)
    if (
      metrics.maxAccelSpike > 25 &&
      metrics.maxGyro > 400 &&
      metrics.speedDrop > 15
    ) {
      score += 0.7;
    }

    // Pattern 2: Hard brake (sustained deceleration)
    if (metrics.yAxisSustained > 1.5 && metrics.sustainedDuration > 30) {
      score += 0.2;
    }

    // Pattern 3: Phone drop signature (impact + tumble + new orientation)
    if (metrics.maxAccelSpike > 15 && metrics.gyroVariance > 50000) {
      // This is likely a drop, not crash
      score = Math.max(0, score - 0.3);
    }

    // Pattern 4: Pothole (sharp spike + recovery)
    if (metrics.zAxisSpike > 3 && metrics.quickRecovery) {
      // Likely pothole, not crash
      score = Math.max(0, score - 0.2);
    }

    // Pattern 5: Post-impact stillness
    if (metrics.finalStillness > 0.8 && score > 0.3) {
      score += 0.2;
    }

    const finalScore = Math.min(Math.max(score, 0), 1);

    return finalScore;
  }

  calculateAdvancedMetrics(data) {
    const accelX = data.map(row => row[0]);
    const accelY = data.map(row => row[1]);
    const accelZ = data.map(row => row[2]);
    const gyroX = data.map(row => row[3]);
    const gyroY = data.map(row => row[4]);
    const gyroZ = data.map(row => row[5]);
    const speeds = data.map(row => row[6]);

    // Calculate magnitudes
    const accelMagnitudes = data.map(row =>
      Math.sqrt(row[0] ** 2 + row[1] ** 2 + row[2] ** 2),
    );

    const gyroMagnitudes = data.map(row =>
      Math.sqrt(row[3] ** 2 + row[4] ** 2 + row[5] ** 2),
    );

    // Find max spike
    const maxAccelSpike = Math.max(...accelMagnitudes);
    const maxGyro = Math.max(...gyroMagnitudes);

    // Y-axis sustained (brake signature)
    const yAxisSustained =
      accelY.slice(10, 80).reduce((a, b) => a + Math.abs(b), 0) / 70;
    let sustainedDuration = 0;
    for (let i = 10; i < 80; i++) {
      if (Math.abs(accelY[i]) > 1.0) {
        sustainedDuration++;
      }
    }

    // Speed drop
    const speedDrop = speeds[0] - speeds[speeds.length - 1];

    // Gyro variance (tumbling signature)
    const gyroMean =
      gyroMagnitudes.reduce((a, b) => a + b, 0) / gyroMagnitudes.length;
    const gyroVariance =
      gyroMagnitudes.reduce((sum, val) => sum + (val - gyroMean) ** 2, 0) /
      gyroMagnitudes.length;

    // Z-axis spike (pothole signature)
    const zAxisSpike = Math.max(...accelZ.map(Math.abs));

    // Quick recovery (spike then return to normal)
    const firstHalfMax = Math.max(...accelMagnitudes.slice(0, 75));
    const secondHalfMax = Math.max(...accelMagnitudes.slice(75));
    const quickRecovery = firstHalfMax > 2 * secondHalfMax;

    // Final stillness (post-impact)
    const last20 = accelMagnitudes.slice(-20);
    const finalStillness =
      1 -
      last20.reduce((a, b) => a + Math.abs(b - 9.8), 0) / 20 / 9.8;

    return {
      maxAccelSpike,
      maxGyro,
      yAxisSustained,
      sustainedDuration,
      speedDrop,
      gyroVariance,
      zAxisSpike,
      quickRecovery,
      finalStillness,
    };
  }

  dispose() {
    this.isReady = false;
  }
}

export default new TFLiteService();