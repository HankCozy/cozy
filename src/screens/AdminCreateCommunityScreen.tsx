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
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

interface GeneratedCode {
  organization: string;
  code: string;
  managerEmail: string;
}

export default function AdminCreateCommunityScreen() {
  const { auth } = useAuth();

  const [organization, setOrganization] = useState('');
  const [division, setDivision] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);

  const handleCreateCommunity = async () => {
    // Validation
    if (!organization.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    if (!accountOwner.trim()) {
      Alert.alert('Error', 'Account manager is required');
      return;
    }

    if (!managerEmail.trim()) {
      Alert.alert('Error', 'Manager email is required');
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
          accountOwner: accountOwner.trim(),
          managerEmail: managerEmail.trim().toLowerCase()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store generated code
        setGeneratedCode({
          organization: data.community.organization,
          code: data.invitationCode,
          managerEmail: managerEmail.trim()
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to create community');
      }
    } catch (error) {
      console.error('Community operation error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;

    const codeText = `${generatedCode.organization} Invitation Code\n\nCode: ${generatedCode.code}\n\nManager Email: ${generatedCode.managerEmail}\n\nShare this code with all community members. The manager (${generatedCode.managerEmail}) will be automatically assigned when they register.`;

    await Clipboard.setStringAsync(codeText);
    Alert.alert('Success', 'Invitation code copied to clipboard');
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
          <Text style={styles.headerTitle}>CREATE COMMUNITY</Text>
          <Text style={styles.headerSubtitle}>
            System will generate a unique invitation code
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
            <Text style={styles.label}>
              Account Manager <Text style={styles.required}>*</Text>
            </Text>
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateCommunity}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Feather name="key" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Generate Code</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Generated Code Section */}
          {generatedCode && (
            <View style={styles.generatedSection}>
              <View style={styles.generatedHeader}>
                <Feather name="check-circle" size={20} color="#10B981" />
                <Text style={styles.generatedTitle}>Code Generated Successfully!</Text>
              </View>

              <View style={styles.codeGroup}>
                <Text style={styles.codeLabel}>Invitation Code</Text>
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeText}>{generatedCode.code}</Text>
                </View>
                <Text style={styles.codeHelper}>
                  Share with all members of {generatedCode.organization}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Feather name="info" size={16} color="#3b82f6" />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Manager:</Text> {generatedCode.managerEmail} will be auto-assigned as manager when they register with this code.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
              >
                <Feather name="copy" size={18} color="#ffffff" />
                <Text style={styles.copyButtonText}>Copy Invitation Code</Text>
              </TouchableOpacity>
            </View>
          )}
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
  generatedSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  generatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  generatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  codeGroup: {
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  codeDisplay: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  codeHelper: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
