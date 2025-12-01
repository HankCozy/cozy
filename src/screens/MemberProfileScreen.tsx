import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getProfilePictureUrl } from '../services/api';

interface MemberProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: 'MEMBER' | 'MANAGER';
  profileSummary: string | null;
  profilePictureUrl: string | null;
  profileAnswers: Array<{
    sectionId: string;
    question: string;
    transcript?: string;
    timestamp: string;
  }>;
  createdAt: string;
}

export default function MemberProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { auth } = useAuth();
  const token = auth.token;
  const { userId } = route.params;

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilePictureSignedUrl, setProfilePictureSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberProfile();
  }, [userId]);

  const fetchMemberProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/communities/members/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMember(data.user);

        // Fetch signed URL for profile picture if user has one
        if (data.user.profilePictureUrl && token) {
          const signedUrl = await getProfilePictureUrl(userId, token);
          setProfilePictureSignedUrl(signedUrl);
        }
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to fetch member profile:', error);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Member Info Card */}
        <View style={styles.memberInfoCard}>
          {profilePictureSignedUrl ? (
            <Image
              source={{ uri: profilePictureSignedUrl }}
              style={styles.memberAvatarImage}
            />
          ) : (
            <View style={styles.memberAvatar}>
              <Feather name="user" size={32} color="white" />
            </View>
          )}
          <Text style={styles.memberName}>
            {member.firstName} {member.lastName}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {member.role === 'MANAGER' ? 'Manager' : 'Member'}
            </Text>
          </View>
        </View>

        {/* Profile Summary */}
        {member.profileSummary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Feather name="file-text" size={20} color="#3b82f6" />
              <Text style={styles.summaryTitle}>Profile Summary</Text>
            </View>
            <Text style={styles.summaryText}>{member.profileSummary}</Text>
          </View>
        )}

        {/* Q&A Answers */}
        {member.profileAnswers && member.profileAnswers.length > 0 && (
          <View style={styles.answersSection}>
            <Text style={styles.answersHeader}>
              Profile Answers ({member.profileAnswers.length})
            </Text>
            {member.profileAnswers.map((answer, index) => (
              <View key={index} style={styles.answerCard}>
                <Text style={styles.question}>{answer.question}</Text>
                {answer.transcript ? (
                  <Text style={styles.transcript}>{answer.transcript}</Text>
                ) : (
                  <Text style={styles.noTranscript}>No transcript available</Text>
                )}
                <Text style={styles.timestamp}>
                  {new Date(answer.timestamp).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!member.profileSummary && (!member.profileAnswers || member.profileAnswers.length === 0) && (
          <View style={styles.emptyState}>
            <Feather name="user" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No profile content yet</Text>
            <Text style={styles.emptyStateSubtext}>
              This member hasn't added any profile information.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBackButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  memberInfoCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  memberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  memberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
  answersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  answersHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  answerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
