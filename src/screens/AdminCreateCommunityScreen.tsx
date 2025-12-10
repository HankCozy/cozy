import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useNavigation } from '@react-navigation/native';

export default function AdminCreateCommunityScreen() {
  const { auth } = useAuth();
  const navigation = useNavigation();
  const [organization, setOrganization] = useState('');
  const [division, setDivision] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCommunity = async () => {
    // Validation
    if (!organization.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    if (!managerEmail.trim()) {
      Alert.alert('Error', 'Manager email is required');
      return;
    }

    if (!codePrefix.trim()) {
      Alert.alert('Error', 'Invitation code prefix is required');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(managerEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/communities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization: organization.trim(),
          division: division.trim() || null,
          accountOwner: accountOwner.trim() || null,
          managerEmail: managerEmail.trim().toLowerCase(),
          memberInviteCodePrefix: codePrefix.trim().toUpperCase()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Clear form
        setOrganization('');
        setDivision('');
        setAccountOwner('');
        setManagerEmail('');
        setCodePrefix('');

        // Show success message with invitation codes
        Alert.alert(
          'Community Created!',
          `Organization: ${data.community.organization}\n\nInvitation Codes:\n\nMember Code:\n${data.invitationCodes.member}\n\nManager Code:\n${data.invitationCodes.manager}\n\nShare these codes with your community members.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to dashboard if it exists
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to create community');
      }
    } catch (error) {
      console.error('Create community error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Community</Text>
          <Text style={styles.headerSubtitle}>
            Set up a new community with invitation codes
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Organization Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Acme Corporation"
              value={organization}
              onChangeText={setOrganization}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Division (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., West Region"
              value={division}
              onChangeText={setDivision}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Owner (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John Smith"
              value={accountOwner}
              onChangeText={setAccountOwner}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Manager Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="manager@example.com"
              value={managerEmail}
              onChangeText={setManagerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <Text style={styles.helperText}>
              This email will be auto-assigned the manager role when they register
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Invitation Code Prefix <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., ACME2025"
              value={codePrefix}
              onChangeText={setCodePrefix}
              autoCapitalize="characters"
              editable={!loading}
            />
            <Text style={styles.helperText}>
              System will generate: {codePrefix.toUpperCase()}_MEMBER and {codePrefix.toUpperCase()}_MGR
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateCommunity}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Feather name="plus-circle" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Create Community</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
