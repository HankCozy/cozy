import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine the API URL based on platform and device type
const getApiUrl = (): string => {
  // For iOS simulator, localhost works fine
  if (Platform.OS === 'ios') {
    return 'http://localhost:3001';
  }

  // For Android
  if (Platform.OS === 'android') {
    // Check if running on emulator or physical device
    const { isDevice } = Constants;

    if (isDevice) {
      // Physical Android device - use your computer's local IP
      // TODO: Update this to your computer's IP address (found via `ipconfig` or `ifconfig`)
      return 'http://192.168.0.42:3001';
    } else {
      // Android emulator - use special address to reach host machine
      return 'http://10.0.2.2:3001';
    }
  }

  // Fallback for web or other platforms
  return 'http://localhost:3001';
};

export const API_BASE_URL = getApiUrl();
