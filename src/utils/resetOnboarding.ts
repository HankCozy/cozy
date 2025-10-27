import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reset onboarding and profile completion flags
 * Use this for testing the onboarding flow
 */
export const resetOnboardingFlags = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('has_seen_onboarding');
    await AsyncStorage.removeItem('has_completed_profile');
    console.log('✅ Onboarding flags reset successfully');
    console.log('Please restart the app to see the onboarding flow');
  } catch (error) {
    console.error('Failed to reset onboarding flags:', error);
  }
};

/**
 * Reset only the profile completion flag
 * Use this to test just the name screen
 */
export const resetProfileFlag = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('has_completed_profile');
    console.log('✅ Profile completion flag reset successfully');
    console.log('Please restart the app to see the name screen');
  } catch (error) {
    console.error('Failed to reset profile flag:', error);
  }
};

/**
 * Reset only the onboarding flag
 * Use this to test just the onboarding slides
 */
export const resetOnboardingFlag = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('has_seen_onboarding');
    console.log('✅ Onboarding flag reset successfully');
    console.log('Please restart the app to see the onboarding');
  } catch (error) {
    console.error('Failed to reset onboarding flag:', error);
  }
};

/**
 * Check current status of flags
 */
export const checkFlags = async (): Promise<void> => {
  try {
    const hasSeenOnboarding = await AsyncStorage.getItem('has_seen_onboarding');
    const hasCompletedProfile = await AsyncStorage.getItem('has_completed_profile');

    console.log('=== Current Flag Status ===');
    console.log('has_seen_onboarding:', hasSeenOnboarding);
    console.log('has_completed_profile:', hasCompletedProfile);
  } catch (error) {
    console.error('Failed to check flags:', error);
  }
};
