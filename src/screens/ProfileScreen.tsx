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
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { generateProfile, extractProfileTags, updateProfileSettings, fetchProfileFromServer, QuestionAnswer, getProfilePictureUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ProfileBadge from '../components/ProfileBadge';
import { compressProfilePicture } from '../utils/imageCompression';
import { API_BASE_URL } from '../config/api';

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

const TAG_PALETTE = [
  { bg: '#00934E', text: 'white' },   // green
  { bg: '#FFA0A6', text: 'white' },   // pink
  { bg: '#FAC63D', text: '#545454' }, // yellow (dark text for contrast)
  { bg: '#FE6627', text: 'white' },   // orange
  { bg: '#E7E0D3', text: '#545454' }, // darker warm white (dark text)
];

function stripProfileHeader(summary: string): string {
  // Remove "[Name] Community Profile" or similar title prefixes Claude may add
  return summary.replace(/^[^\n.!?]{0,60}Community Profile[\s\n]*/i, '').trim();
}

function stripIcebreakerQuestions(summary: string): string {
  const patterns = [
    /---\s*\*?\*?Icebreaker Questions/i,
    /\*\*Icebreaker Questions/i,
    /---/,
  ];
  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match.index !== undefined) {
      return summary.substring(0, match.index).trim();
    }
  }
  return summary;
}

function parseIcebreakerQuestions(summary: string): string[] {
  const separators = [
    /---\s*\*?\*?Icebreaker Questions[:\s]*/i,
    /\*\*Icebreaker Questions\*\*[:\s]*/i,
    /---/,
  ];
  let icebreakerSection = '';
  for (const pattern of separators) {
    const match = summary.match(pattern);
    if (match && match.index !== undefined) {
      icebreakerSection = summary.substring(match.index + match[0].length);
      break;
    }
  }
  if (!icebreakerSection) return [];

  const lines = icebreakerSection.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
    if (cleaned.length > 10) {
      questions.push(cleaned);
      if (questions.length >= 3) break;
    }
  }
  return questions;
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
  const [isPublished, setIsPublished] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [profileInterests, setProfileInterests] = useState<string[]>([]);
  const [contactPublished, setContactPublished] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const SHORT_BIO_WORDS = 55;

  const totalAnswers = answers.length;
  const firstName = auth.user?.firstName || '';
  const fullName = [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ') || 'Your Profile';

  // Derive quote from answers
  const answersWithTranscripts = answers.filter((a) => a.transcript && a.transcript.trim().length > 0);
  const wordCount = (t: string) => t.trim().split(/\s+/).length;
  const communityAnswers = answersWithTranscripts.filter((a) => a.sectionId === 'community');
  const quotePool = communityAnswers.length > 0 ? communityAnswers : answersWithTranscripts;
  const shortestAnswer = quotePool.reduce<Answer | null>((shortest, a) => {
    if (!shortest) return a;
    return wordCount(a.transcript!) < wordCount(shortest.transcript!) ? a : shortest;
  }, null);
  const quoteWords = shortestAnswer?.transcript?.trim().split(/\s+/) ?? [];
  const quoteText = shortestAnswer
    ? quoteWords.slice(0, 20).join(' ') + (quoteWords.length > 20 ? '...' : '')
    : undefined;
  const quoteQuestion = shortestAnswer?.question;
  const bioText = profileSummary ? stripIcebreakerQuestions(profileSummary) : null;
  const icebreakerQuestions = profileSummary ? parseIcebreakerQuestions(profileSummary) : [];

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
      const counts: Record<string, number> = {};
      for (const section of SECTIONS) {
        counts[section.id] = answerKeys.filter(key => key.startsWith(`answer_${section.id}_`)).length;
      }
      setAnswerCounts(counts);
    } catch (error) {
      console.error('Failed to load answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileData = async () => {
    try {
      const [savedSummary, publishedStatus, interests, contactPub] = await Promise.all([
        AsyncStorage.getItem('profile_summary'),
        AsyncStorage.getItem('profile_published'),
        AsyncStorage.getItem('profile_interests'),
        AsyncStorage.getItem('contact_published'),
      ]);

      // If no local profile summary, attempt to hydrate from server (new device scenario)
      if (!savedSummary && token) {
        const serverProfile = await fetchProfileFromServer(token);
        if (serverProfile?.profileSummary) {
          await AsyncStorage.setItem('profile_summary', serverProfile.profileSummary);
          await AsyncStorage.setItem('profile_published', String(serverProfile.profilePublished));
          await AsyncStorage.setItem('contact_published', String(serverProfile.contactPublished));
          setProfileSummary(serverProfile.profileSummary);
          setIsPublished(serverProfile.profilePublished);
          setContactPublished(serverProfile.contactPublished);
          if (serverProfile.profileInterests?.length > 0) {
            await AsyncStorage.setItem('profile_interests', JSON.stringify(serverProfile.profileInterests));
            setProfileInterests(serverProfile.profileInterests);
          }
          return;
        }
      }

      if (savedSummary) setProfileSummary(savedSummary);
      setIsPublished(publishedStatus === 'true');
      setContactPublished(contactPub === 'true');
      if (interests) {
        setProfileInterests(JSON.parse(interests));
      } else if (savedSummary && token) {
        // Auto-extract tags for existing profiles that predate this feature
        const tags = await extractProfileTags(stripIcebreakerQuestions(savedSummary), token);
        if (tags.length > 0) {
          await AsyncStorage.setItem('profile_interests', JSON.stringify(tags));
          setProfileInterests(tags);
          await updateProfileSettings({ profileInterests: tags }, token);
        }
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadAnswers();
      loadProfileData();

      AsyncStorage.getItem('pending_question_flow').then(async (pending) => {
        if (pending === 'true') {
          await AsyncStorage.removeItem('pending_question_flow');
          navigation.navigate('Questions');
        }
      });


      if (auth.user?.id && token) {
        getProfilePictureUrl(auth.user.id, token)
          .then(url => setProfilePictureUrl(url))
          .catch(error => {
            if (error.message === 'TOKEN_EXPIRED') {
              Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
                { text: 'OK', onPress: () => logout() },
              ]);
            }
          });
      }
    }, [auth.user?.id, token])
  );

  const handleGenerateSummary = async () => {
    if (totalAnswers < 6) {
      return; // UI gate should prevent this, but hard-block just in case
    }
    const answersWithT = answers.filter((a) => a.transcript && a.transcript.trim().length > 0);
    if (answersWithT.length === 0) {
      Alert.alert('No Transcripts', 'Record and transcribe some answers before generating a bio.');
      return;
    }
    try {
      setGeneratingSummary(true);
      const questionAnswers: QuestionAnswer[] = answersWithT.map((a) => ({
        sectionId: a.sectionId,
        question: a.question,
        transcript: a.transcript!,
      }));
      const summary = await generateProfile(questionAnswers, token!, {
        maxWords: 400,
        style: 'narrative',
        firstName: auth.user?.firstName,
        lastName: auth.user?.lastName,
        pronouns: auth.user?.pronouns,
      });
      await AsyncStorage.setItem('profile_summary', summary);
      setProfileSummary(summary);

      // Auto-publish profile on first generation
      await AsyncStorage.setItem('profile_published', 'true');
      setIsPublished(true);
      await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileSummary: summary,
          profileAnswers: answers,
          profilePublished: true,
        }),
      });

      // Extract and save interest tags
      if (token) {
        const tags = await extractProfileTags(stripIcebreakerQuestions(summary), token);
        if (tags.length > 0) {
          await AsyncStorage.setItem('profile_interests', JSON.stringify(tags));
          setProfileInterests(tags);
          await updateProfileSettings({ profileInterests: tags }, token);
        }
      }

    } catch (error) {
      console.error('Failed to generate summary:', error);
      Alert.alert('Generation Failed', 'Unable to generate your bio. Check your connection and try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      let finalSummary = editedSummary.trim();
      // Preserve icebreaker section from original
      const patterns = [
        /---\s*\*?\*?Icebreaker Questions/i,
        /\*\*Icebreaker Questions/i,
        /---/,
      ];
      if (profileSummary) {
        for (const pattern of patterns) {
          const match = profileSummary.match(pattern);
          if (match && match.index !== undefined) {
            finalSummary = `${editedSummary.trim()}\n\n${profileSummary.substring(match.index)}`;
            break;
          }
        }
      }
      await AsyncStorage.setItem('profile_summary', finalSummary);
      setProfileSummary(finalSummary);
      setIsEditingProfile(false);
      if (isPublished) {
        await fetch(`${API_BASE_URL}/api/users/profile`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileSummary: finalSummary }),
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleContactToggle = async (enable: boolean) => {
    setContactPublished(enable);
    await AsyncStorage.setItem('contact_published', String(enable));
    if (token) await updateProfileSettings({ contactPublished: enable }, token);
  };

  const handleUploadPhoto = async () => {
    Alert.alert('Upload Photo', 'Choose a photo for your profile', [
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
    ]);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setUploadingPhoto(true);
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });

      if (result.canceled) { setUploadingPhoto(false); return; }

      const compressedUri = await compressProfilePicture(result.assets[0].uri);
      const formData = new FormData();
      formData.append('image', { uri: compressedUri, type: 'image/jpeg', name: 'profile.jpg' } as any);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/users/profile-picture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (uploadResponse.status === 401 || uploadResponse.status === 403) throw new Error('TOKEN_EXPIRED');

      const uploadData = await uploadResponse.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Failed to upload');

      if (!auth.user?.id) throw new Error('User not authenticated');
      const signedUrl = await getProfilePictureUrl(auth.user.id, token);
      setProfilePictureUrl(signedUrl);
      dispatch({ type: 'UPDATE_USER', payload: { profilePictureUrl: 'uploaded' } });
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
        Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
          { text: 'OK', onPress: () => logout() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearAllAnswers = async () => {
    Alert.alert('Clear All Answers', 'This will permanently delete all your answers, recordings, and profile. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const keysToRemove = keys.filter(
              (key) =>
                key.startsWith('answer_') ||
                key.startsWith('section_') ||
                key === 'profile_summary' ||
                key === 'profile_published' ||
                key === 'profile_interests' ||
                key === 'contact_published'
            );
            await AsyncStorage.multiRemove(keysToRemove);
            setAnswers([]);
            setAnswerCounts({});
            setProfileSummary(null);
            setIsPublished(false);
            setProfileInterests([]);
            setContactPublished(false);
            Alert.alert('Success', 'All profile data cleared');
          } catch {
            Alert.alert('Error', 'Failed to clear answers');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert('Delete My Account', 'This will permanently delete your account and all data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/users/account`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
              Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
                { text: 'OK', onPress: () => logout() },
              ]);
            } else {
              Alert.alert('Error', data.error || 'Failed to delete account');
            }
          } catch {
            Alert.alert('Error', 'Network error. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowSettingsMenu(true)}>
            <Feather name="settings" size={24} color="#BE9B51" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettingsMenu} transparent animationType="fade" onRequestClose={() => setShowSettingsMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSettingsMenu(false)}>
              <Feather name="x" size={24} color="#BE9B51" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Settings</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSettingsMenu(false);
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => logout() },
              ]);
            }}>
              <Feather name="log-out" size={24} color="#f59e0b" />
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); clearAllAnswers(); }}>
              <Feather name="trash-2" size={24} color="#ef4444" />
              <Text style={styles.menuItemText}>Clear Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); navigation.navigate('PrivacyPolicy'); }}>
              <Feather name="shield" size={24} color="#10B981" />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => { setShowSettingsMenu(false); handleDeleteAccount(); }}>
              <Feather name="user-x" size={24} color="#dc2626" />
              <Text style={styles.menuItemText}>Delete My Account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00934E" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

          {/* Avatar floating above card — top of card starts 30% through badge */}
          <TouchableOpacity
            onPress={handleUploadPhoto}
            disabled={uploadingPhoto}
            style={styles.profileBadgeFloat}
          >
            <ProfileBadge
              firstName={auth.user?.firstName}
              lastName={auth.user?.lastName}
              totalAnswers={totalAnswers}
              profilePictureUrl={profilePictureUrl}
              size={80}
            />
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{fullName}</Text>

            {/* Tags + Bio — only shown once profile is complete (6+ answers) */}
            {totalAnswers < 6 ? (
              <Text style={styles.profileIncompleteText}>
                Answer {6 - totalAnswers} more question{6 - totalAnswers === 1 ? '' : 's'} to complete your profile
              </Text>
            ) : (
              <>
                {/* Interest Tags */}
                {profileInterests.length > 0 && (
                  <View style={styles.tagsRow}>
                    {profileInterests.slice(0, 6).map((tag, i) => {
                      const palette = TAG_PALETTE[i % TAG_PALETTE.length];
                      return (
                        <View key={i} style={[styles.tag, { backgroundColor: palette.bg }]}>
                          <Text style={[styles.tagText, { color: palette.text }]}>
                            {tag.charAt(0).toUpperCase() + tag.slice(1)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Bio */}
                {isEditingProfile ? (
                  <View style={styles.editBioContainer}>
                    <TextInput
                      ref={textInputRef}
                      style={styles.editBioInput}
                      value={editedSummary}
                      onChangeText={setEditedSummary}
                      multiline
                      textAlignVertical="top"
                      autoFocus
                    />
                    <View style={styles.editBioActions}>
                      <TouchableOpacity style={styles.cancelEditButton} onPress={() => { setIsEditingProfile(false); setEditedSummary(''); }}>
                        <Text style={styles.cancelEditText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBioButton} onPress={handleSaveBio}>
                        <Text style={styles.saveBioText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : bioText ? (() => {
                  const words = bioText.split(/\s+/);
                  const isTruncated = words.length > SHORT_BIO_WORDS;
                  const displayText = (!bioExpanded && isTruncated)
                    ? words.slice(0, SHORT_BIO_WORDS).join(' ') + '...'
                    : bioText;
                  return (
                    <>
                      <Text style={styles.bioText}>{displayText}</Text>
                      <View style={styles.bioActions}>
                        {isTruncated && (
                          <TouchableOpacity style={styles.addBioLink} onPress={() => setBioExpanded(!bioExpanded)}>
                            {bioExpanded ? (
                              <Text style={styles.addBioLinkText}>Show less</Text>
                            ) : (
                              <>
                                <Text style={styles.addBioLinkText}>Show full bio </Text>
                                <Text style={styles.addBioSparkle}>✦</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.addBioLink}
                          onPress={() => { setEditedSummary(bioText); setIsEditingProfile(true); }}
                        >
                          <Text style={styles.addBioLinkText}>Edit bio</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })() : (
                  <TouchableOpacity style={styles.addBioLink} onPress={handleGenerateSummary} disabled={generatingSummary}>
                    {generatingSummary ? (
                      <ActivityIndicator size="small" color="#00934E" />
                    ) : (
                      <Text style={styles.addBioLinkText}>Add a bio</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Quote Card */}
          {quoteText && (
            <View style={styles.quoteCard}>
              {quoteQuestion && <Text style={styles.quoteQuestion}>{quoteQuestion}</Text>}
              <Text style={styles.quoteText}>"{quoteText}"</Text>

              {answersWithTranscripts.length > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.showResponsesLink}
                    onPress={() => setShowResponses(!showResponses)}
                  >
                    <Text style={styles.showResponsesLinkText}>
                      {showResponses ? 'Hide all responses' : 'View all responses'}
                    </Text>
                    <Feather
                      name={showResponses ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#00934E"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>

                  {showResponses && [...answersWithTranscripts]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((answer, i) => (
                      <View key={i} style={styles.responseCard}>
                        <Text style={styles.responseCardQuestion}>{answer.question}</Text>
                        <Text style={styles.responseCardText}>{answer.transcript}</Text>
                      </View>
                    ))
                  }
                </>
              )}
            </View>
          )}

          {/* Icebreaker Card */}
          {icebreakerQuestions.length > 0 && (
            <View style={styles.icebreakerCard}>
              <Text style={styles.icebreakerLabel}>
                Icebreakers for {firstName || 'you'}:
              </Text>
              {icebreakerQuestions.map((q, i) => (
                <Text key={i} style={styles.icebreakerQuestion}>{q}</Text>
              ))}
            </View>
          )}

          {/* MESSAGING_DISABLED: Get in Touch — hidden until messaging is ready to ship
          {profileSummary && (
            <View style={styles.contactCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>Get in touch:</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity onPress={() => handleContactToggle(true)}>
                    <Text style={[styles.toggleOption, contactPublished && styles.toggleOptionActive]}>ENABLED</Text>
                  </TouchableOpacity>
                  <Text style={styles.toggleSep}> / </Text>
                  <TouchableOpacity onPress={() => handleContactToggle(false)}>
                    <Text style={[styles.toggleOption, !contactPublished && styles.toggleOptionActive]}>DISABLED</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.emailButton, !contactPublished && styles.emailButtonDisabled]}
                onPress={() => contactPublished && Linking.openURL(`mailto:${auth.user?.email}`)}
                activeOpacity={contactPublished ? 0.85 : 1}
                disabled={!contactPublished}
              >
                <Text style={[styles.emailButtonText, !contactPublished && styles.emailButtonTextDisabled]}>Email {firstName || 'me'}</Text>
              </TouchableOpacity>
            </View>
          )}
          */}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7E6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF7E6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    borderRadius: 20,
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
    color: '#545454',
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
    color: '#545454',
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  // Avatar floats above card — marginBottom pulls card up so card top = 30% through badge (24px)
  profileBadgeFloat: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: -56, // card top at 24px = 30% of 80px badge; badge extends 56px into card
    zIndex: 10,
  },
  // Profile Card
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingTop: 68, // 56px badge overlap + 12px breathing room
    paddingHorizontal: 28,
    paddingBottom: 40,
    marginBottom: 16,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 20,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00934E',
  },
  profileName: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#545454',
    marginBottom: 30,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 8,
    marginBottom: 30,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#545454',
    marginBottom: 12,
  },
  profileIncompleteText: {
    fontSize: 15,
    color: '#BE9B51',
    fontFamily: 'Futura',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 22,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: '#BE9B51',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bioActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  addBioLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBioLinkText: {
    fontSize: 14,
    color: '#545454',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  addBioSparkle: {
    fontSize: 14,
    color: '#00934E',
  },
  editBioContainer: {
    marginTop: 8,
  },
  editBioInput: {
    fontSize: 15,
    lineHeight: 24,
    color: '#545454',
    borderWidth: 1,
    borderColor: '#00934E',
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    minHeight: 160,
    marginBottom: 10,
  },
  editBioActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BE9B51',
  },
  saveBioButton: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0277BB',
    alignItems: 'center',
  },
  saveBioText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Quote Card
  quoteCard: {
    backgroundColor: '#F0FAF5',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#00934E',
  },
  quoteQuestion: {
    fontSize: 13,
    color: '#545454',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#007F45',
    lineHeight: 30,
  },
  // Section Headers with Toggle
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#00934E',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleOption: {
    fontSize: 12,
    fontWeight: '400',
    color: '#BE9B51',
    letterSpacing: 0.5,
  },
  toggleOptionActive: {
    fontWeight: '700',
    color: '#545454',
  },
  toggleSep: {
    fontSize: 12,
    color: '#BE9B51',
    marginHorizontal: 2,
  },
  // Icebreaker Card
  icebreakerCard: {
    backgroundColor: '#0277BB',
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    marginTop: 8,
  },
  icebreakerLabel: {
    fontSize: 13,
    color: 'rgba(147,197,253,0.9)',
    marginBottom: 14,
    fontWeight: '500',
  },
  icebreakerQuestion: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    marginBottom: 12,
  },
  // Email Button
  // Show responses
  showResponsesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
  showResponsesLinkText: {
    fontSize: 14,
    color: '#00934E',
    fontWeight: '600',
    fontFamily: 'Futura',
  },
  responseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  responseCardQuestion: {
    fontSize: 13,
    color: '#00934E',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  responseCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#545454',
    lineHeight: 24,
  },
  // Contact Card
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  emailButton: {
    backgroundColor: '#0277BB',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  emailButtonDisabled: {
    backgroundColor: '#E7E0D3',
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  emailButtonTextDisabled: {
    color: '#BE9B51',
  },
  bottomSpacer: {
    height: 32,
  },
});
