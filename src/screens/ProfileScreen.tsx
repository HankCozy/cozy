import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { generateProfile, QuestionAnswer, getProfilePictureUrl } from '../services/api';
import { resetOnboardingFlags } from '../utils/resetOnboarding';
import { useAuth } from '../contexts/AuthContext';
import ProfileBadge from '../components/ProfileBadge';
import { compressProfilePicture } from '../utils/imageCompression';
import { API_BASE_URL } from '../config/api';
import { getStrengthLevel, getStrengthColor, getStrengthLabel } from '../utils/profileStrength';

interface Answer {
  sectionId: string;
  question: string;
  audioUri?: string;
  transcript?: string;
  timestamp: string;
}

const SECTIONS = [
  { id: 'identity', name: 'Identity', icon: 'user', color: '#3b82f6' },
  { id: 'relationships', name: 'Relationships', icon: 'heart', color: '#ec4899' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'coffee', color: '#10b981' },
  { id: 'community', name: 'Community', icon: 'users', color: '#f59e0b' },
];

/**
 * Remove icebreaker questions from profile summary
 * (Only shown to others, not to the profile owner)
 */
function stripIcebreakerQuestions(summary: string): string {
  // Try multiple patterns to find the icebreaker section
  const patterns = [
    /---\s*\*?\*?Icebreaker Questions/i,  // Match "---**Icebreaker Questions" or "--- **Icebreaker Questions"
    /\*\*Icebreaker Questions/i,           // Match "**Icebreaker Questions"
    /---/,                                  // Match plain "---"
  ];

  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match.index !== undefined) {
      return summary.substring(0, match.index).trim();
    }
  }

  // If no separator found, return original
  return summary;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { auth, logout, dispatch } = useAuth();
  const token = auth.token;
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [shareProfileSummary, setShareProfileSummary] = useState(true);
  const [shareResponses, setShareResponses] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Calculate total answers across all sections
  const totalAnswers = Object.values(answerCounts).reduce((sum, count) => sum + count, 0);

  const loadAnswers = async () => {
    try {
      setLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      const answerKeys = keys.filter((key) => key.startsWith('answer_'));
      const answerData = await AsyncStorage.multiGet(answerKeys);

      const parsedAnswers = answerData
        .map(([_, value]) => (value ? JSON.parse(value) : null))
        .filter((answer) => answer !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAnswers(parsedAnswers);

      // Load answer counts for each section
      const counts: Record<string, number> = {};
      for (const section of SECTIONS) {
        // Count answers for this section
        const sectionAnswers = answerKeys.filter(key => key.startsWith(`answer_${section.id}_`));
        counts[section.id] = sectionAnswers.length;
      }
      setAnswerCounts(counts);
    } catch (error) {
      console.error('Failed to load answers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload answers when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadAnswers();
      loadProfileSummary();

      // Load profile picture signed URL
      if (auth.user?.id && token) {
        getProfilePictureUrl(auth.user.id, token)
          .then(url => {
            setProfilePictureUrl(url);
          })
          .catch(error => {
            if (error.message === 'TOKEN_EXPIRED') {
              Alert.alert(
                'Session Expired',
                'Your session has expired. Please login again.',
                [{ text: 'OK', onPress: () => logout() }]
              );
            }
          });
      }
    }, [auth.user?.id, token])
  );

  const loadProfileSummary = async () => {
    try {
      const savedSummary = await AsyncStorage.getItem('profile_summary');
      if (savedSummary) {
        setProfileSummary(savedSummary);
      }

      // Load published status
      const publishedStatus = await AsyncStorage.getItem('profile_published');
      setIsPublished(publishedStatus === 'true');
    } catch (error) {
      console.error('Failed to load profile summary:', error);
    }
  };

  const handleGenerateSummary = async () => {
    // Check if we have transcripts
    const answersWithTranscripts = answers.filter(
      (a) => a.transcript && a.transcript.trim().length > 0
    );

    if (answersWithTranscripts.length === 0) {
      Alert.alert(
        'No Transcripts Available',
        'Please record and transcribe some answers before generating a profile summary.'
      );
      return;
    }

    try {
      setGeneratingSummary(true);

      // Convert answers to QuestionAnswer format
      const questionAnswers: QuestionAnswer[] = answersWithTranscripts.map((a) => ({
        sectionId: a.sectionId,
        question: a.question,
        transcript: a.transcript!,
      }));

      // Generate summary using Claude with user's actual name
      const summary = await generateProfile(questionAnswers, token!, {
        maxWords: 400,
        style: 'narrative',
        firstName: auth.user?.firstName,
        lastName: auth.user?.lastName,
      });

      // Save to AsyncStorage
      await AsyncStorage.setItem('profile_summary', summary);
      setProfileSummary(summary);

      // Unpublish profile when regenerating (requires re-sharing)
      await AsyncStorage.setItem('profile_published', 'false');
      setIsPublished(false);

      Alert.alert(
        'Profile Generated!',
        'Your new profile is ready. Review it and click "Share Profile" when you\'re ready to publish.'
      );
    } catch (error) {
      console.error('Failed to generate summary:', error);
      Alert.alert(
        'Generation Failed',
        'Unable to generate profile summary. Please check your connection and try again.'
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  const clearAllAnswers = async () => {
    Alert.alert(
      'Clear All Answers',
      'This will permanently delete all your answers, recordings, profile summary, and published status. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all keys from AsyncStorage
              const keys = await AsyncStorage.getAllKeys();

              // Filter keys to remove answers, section completion, profile summary, and published status
              const keysToRemove = keys.filter(
                (key) =>
                  key.startsWith('answer_') ||
                  key.startsWith('section_') ||
                  key === 'profile_summary' ||
                  key === 'profile_published'
              );

              // Remove all filtered keys
              await AsyncStorage.multiRemove(keysToRemove);

              // Reset state
              setAnswers([]);
              setAnswerCounts({});
              setProfileSummary(null);
              setIsPublished(false);

              Alert.alert('Success', 'All answers and profile data have been cleared');
            } catch (error) {
              console.error('Failed to clear answers:', error);
              Alert.alert('Error', 'Failed to clear answers');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete My Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/users/account`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted.',
                  [{ text: 'OK', onPress: () => logout() }]
                );
              } else {
                Alert.alert('Error', data.error || 'Failed to delete account');
              }
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const hasAnswers = answers.length > 0;

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding and name screen flags. You will need to restart the app to see the onboarding flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboardingFlags();
            Alert.alert('Success', 'Flags reset! Please restart the app to see the onboarding flow.');
          },
        },
      ]
    );
  };

  const handlePublishProfile = async () => {
    try {
      setIsPublishing(true);

      // Prepare profile data based on checkbox selections
      const profileData = {
        profileSummary: shareProfileSummary ? (profileSummary || null) : null,
        profileAnswers: shareResponses ? answers : [],
        profilePublished: true,
      };

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Save published status locally
        await AsyncStorage.setItem('profile_published', 'true');
        setIsPublished(true);
        Alert.alert('Success!', 'Your profile is now published and visible to your community.');
      } else {
        Alert.alert('Error', data.error || 'Failed to publish profile');
      }
    } catch (error) {
      console.error('Failed to publish profile:', error);
      Alert.alert('Error', 'Failed to publish profile. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUploadPhoto = async () => {
    Alert.alert(
      'Upload Photo',
      'Choose a photo for your profile',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Required', 'Please allow camera access.');
              return;
            }
            await pickImage('camera');
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Required', 'Please allow photo library access.');
              return;
            }
            await pickImage('library');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setUploadingPhoto(true);

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

      if (result.canceled) {
        setUploadingPhoto(false);
        return;
      }

      // Compress the image
      const compressedUri = await compressProfilePicture(result.assets[0].uri);

      // Create FormData to send image to backend
      const formData = new FormData();
      formData.append('image', {
        uri: compressedUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      // Upload via backend endpoint (backend handles Supabase upload with service role key)
      const uploadResponse = await fetch(`${API_BASE_URL}/api/users/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Check for authentication errors
      if (uploadResponse.status === 401 || uploadResponse.status === 403) {
        throw new Error('TOKEN_EXPIRED');
      }

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload');
      }

      // Fetch signed URL to display the new image
      if (!auth.user?.id) throw new Error('User not authenticated');
      const signedUrl = await getProfilePictureUrl(auth.user.id, token);
      setProfilePictureUrl(signedUrl);
      dispatch({ type: 'UPDATE_USER', payload: { profilePictureUrl: 'uploaded' } });

      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
      } else {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Profile</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowSettingsMenu(true)}
            >
              <Feather name="menu" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings Menu Modal */}
      <Modal
        visible={showSettingsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSettingsMenu(false)}
            >
              <Feather name="x" size={24} color="#6b7280" />
            </TouchableOpacity>

            {/* Menu title */}
            <Text style={styles.modalTitle}>Settings</Text>

            {/* Menu items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowSettingsMenu(false);
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Logout',
                      style: 'destructive',
                      onPress: () => logout(),
                    },
                  ]
                );
              }}
            >
              <Feather name="log-out" size={24} color="#f59e0b" />
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowSettingsMenu(false);
                clearAllAnswers();
              }}
            >
              <Feather name="trash-2" size={24} color="#ef4444" />
              <Text style={styles.menuItemText}>Clear Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowSettingsMenu(false);
                navigation.navigate('Onboarding', {});
              }}
            >
              <Feather name="refresh-cw" size={24} color="#3b82f6" />
              <Text style={styles.menuItemText}>Reset Onboarding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setShowSettingsMenu(false);
                handleDeleteAccount();
              }}
            >
              <Feather name="user-x" size={24} color="#dc2626" />
              <Text style={styles.menuItemText}>Delete My Account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              onPress={handleUploadPhoto}
              disabled={uploadingPhoto}
              style={styles.profileBadgeContainer}
            >
              <ProfileBadge
                firstName={auth.user?.firstName}
                lastName={auth.user?.lastName}
                totalAnswers={totalAnswers}
                profilePictureUrl={profilePictureUrl}
                size={120}
              />
              {uploadingPhoto && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              <View style={styles.cameraIconBadge}>
                <Feather name="camera" size={18} color="#3b82f6" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>
              {auth.user?.firstName || auth.user?.lastName
                ? `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim()
                : 'Your Profile'
              }
            </Text>
            <Text style={styles.uploadPhotoHint}>Tap photo to change</Text>
          </View>

          {/* Progress Tracker */}
          <TouchableOpacity
            style={styles.progressCard}
            onPress={() => navigation.navigate('QuestionFlowStack')}
            activeOpacity={0.7}
          >
            {/* Profile Strength Indicator */}
            <View style={styles.strengthContainer}>
              <Text style={styles.strengthLabel}>Profile Strength</Text>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${(totalAnswers / 16) * 100}%`,
                      backgroundColor: getStrengthColor(getStrengthLevel(totalAnswers)),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Answer More Questions Button */}
            <View style={styles.answerMoreButton}>
              <Feather name="plus-circle" size={16} color="#9ca3af" />
              <Text style={styles.answerMoreButtonText}>Answer more questions</Text>
            </View>
          </TouchableOpacity>

          {/* Published Status Badge */}
          {isPublished && (
            <View style={styles.publishedContainer}>
              <View style={styles.publishedBadge}>
                <Feather name="check-circle" size={20} color="white" />
                <Text style={styles.publishedText}>Profile Published</Text>
              </View>
              <TouchableOpacity
                style={styles.unpublishButton}
                onPress={async () => {
                  Alert.alert(
                    'Unpublish Profile',
                    'Your profile will be hidden from your circle. You can re-share it anytime.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Unpublish',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            // Update backend to unpublish
                            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                profileSummary: null,
                                profileAnswers: [],
                                profilePublished: false,
                              }),
                            });

                            if (response.ok) {
                              await AsyncStorage.setItem('profile_published', 'false');
                              setIsPublished(false);
                              Alert.alert('Success', 'Your profile is now private.');
                            } else {
                              Alert.alert('Error', 'Failed to unpublish profile. Please try again.');
                            }
                          } catch (error) {
                            console.error('Unpublish error:', error);
                            Alert.alert('Error', 'Failed to unpublish profile. Please try again.');
                          }
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Feather name="eye-off" size={16} color="#6b7280" />
                <Text style={styles.unpublishButtonText}>Make Private</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Share Profile Button - Show above profile when summary exists but not published */}
          {!isPublished && profileSummary && totalAnswers >= 4 && (
            <View style={styles.profileActionContainer}>
              <Text style={styles.shareQuestion}>What would you like to share?</Text>

              {/* Checkbox for Profile Summary */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setShareProfileSummary(!shareProfileSummary)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {shareProfileSummary && (
                    <Feather name="check" size={16} color="#3b82f6" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Profile Summary</Text>
              </TouchableOpacity>

              {/* Checkbox for Your Responses */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setShareResponses(!shareResponses)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {shareResponses && (
                    <Feather name="check" size={16} color="#3b82f6" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Your Responses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.publishButton,
                  (!shareProfileSummary && !shareResponses) && styles.publishButtonDisabled
                ]}
                onPress={handlePublishProfile}
                disabled={isPublishing || (!shareProfileSummary && !shareResponses)}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="share-2" size={20} color="white" />
                    <Text style={styles.publishButtonText}>Share Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Profile Summary */}
          {profileSummary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Feather name="user" size={20} color="#3b82f6" />
                <Text style={styles.summaryTitle}>Profile Summary</Text>
              </View>

              {isEditingProfile ? (
                <TextInput
                  ref={textInputRef}
                  style={styles.summaryTextInput}
                  value={editedSummary}
                  onChangeText={setEditedSummary}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  autoFocus
                />
              ) : (
                <Text style={styles.summaryText}>
                  {stripIcebreakerQuestions(profileSummary)}
                </Text>
              )}

              <View style={styles.summaryActions}>
                {isEditingProfile ? (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsEditingProfile(false);
                        setEditedSummary('');
                      }}
                    >
                      <Feather name="x" size={16} color="#ef4444" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={async () => {
                        try {
                          // Preserve icebreaker questions from original summary
                          let finalSummary = editedSummary.trim();

                          // Find where icebreaker section starts in original
                          const patterns = [
                            /---\s*\*?\*?Icebreaker Questions/i,
                            /\*\*Icebreaker Questions/i,
                            /---/,
                          ];

                          for (const pattern of patterns) {
                            const match = profileSummary.match(pattern);
                            if (match && match.index !== undefined) {
                              const icebreakerSection = profileSummary.substring(match.index);
                              finalSummary = `${editedSummary.trim()}\n\n${icebreakerSection}`;
                              break;
                            }
                          }

                          // Save locally
                          await AsyncStorage.setItem('profile_summary', finalSummary);
                          setProfileSummary(finalSummary);
                          setIsEditingProfile(false);

                          // If profile is published, auto-update the published version
                          if (isPublished) {
                            const profileData = {
                              profileSummary: shareProfileSummary ? finalSummary : null,
                              profileAnswers: shareResponses ? answers : [],
                              profilePublished: true,
                            };

                            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(profileData),
                            });

                            if (response.ok) {
                              Alert.alert('Success', 'Your published profile has been updated!');
                            } else {
                              Alert.alert('Success', 'Profile saved locally. Please re-share to update your published profile.');
                            }
                          } else {
                            Alert.alert('Success', 'Profile updated!');
                          }
                        } catch (_error) {
                          Alert.alert('Error', 'Failed to save changes');
                        }
                      }}
                    >
                      <Feather name="check" size={16} color="#10b981" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setEditedSummary(stripIcebreakerQuestions(profileSummary));
                        setIsEditingProfile(true);
                      }}
                    >
                      <Feather name="edit-2" size={16} color="#3b82f6" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.regenerateButton}
                      onPress={handleGenerateSummary}
                      disabled={generatingSummary}
                    >
                      {generatingSummary ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                      ) : (
                        <>
                          <Feather name="refresh-cw" size={16} color="#3b82f6" />
                          <Text style={styles.regenerateButtonText}>Regenerate</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Create Profile Draft Button - Show only when no summary exists */}
          {!isPublished && !profileSummary && totalAnswers >= 4 && (
            <View style={styles.profileActionContainer}>
              <TouchableOpacity
                style={styles.publishButton}
                onPress={handleGenerateSummary}
                disabled={generatingSummary}
              >
                {generatingSummary ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="file-text" size={20} color="white" />
                    <Text style={styles.publishButtonText}>Create Profile Draft</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.aiCaption}>
                Our AI model is trained and secure to create your personalized profile
              </Text>
            </View>
          )}

          {/* Responses List */}
          {hasAnswers && (
            <>
              <TouchableOpacity
                style={styles.responsesHeader}
                onPress={() => setShowResponses(!showResponses)}
                activeOpacity={0.7}
              >
                <Text style={styles.responsesHeaderText}>Your Responses</Text>
                <Feather
                  name={showResponses ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {showResponses && answers.map((answer, index) => (
                <View key={index} style={styles.answerCard}>
                  <Text style={styles.question}>{answer.question}</Text>
                  {answer.transcript ? (
                    <Text style={styles.transcript}>{answer.transcript}</Text>
                  ) : (
                    <Text style={styles.noTranscript}>Transcription not available</Text>
                  )}
                  <Text style={styles.timestamp}>
                    {new Date(answer.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 16,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  progressHeadline: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  strengthContainer: {
    marginBottom: 16,
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  answerMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  answerMoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  strengthBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'left',
  },
  sectionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  sectionFeatherContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 180,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  summaryTextInput: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f0f9ff',
    minHeight: 200,
  },
  summaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  generateButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  responsesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  responsesHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  answerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  transcript: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 12,
  },
  noTranscript: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9ca3af',
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  profileActionContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  aiCaption: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  publishButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  publishButtonTextDisabled: {
    color: '#9CA3AF',
  },
  publishedContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  publishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  publishedText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  unpublishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  unpublishButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  profileBadgeContainer: {
    position: 'relative',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPhotoHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  shareQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
});