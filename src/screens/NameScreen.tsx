import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const PRONOUN_OPTIONS = [
  { label: 'He / Him', value: 'he/him' },
  { label: 'She / Her', value: 'she/her' },
  { label: 'They / Them', value: 'they/them' },
  { label: 'Prefer not to say', value: '' },
];

export default function NameScreen() {
  const { updateUserProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pronouns, setPronouns] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter both first and last name');
      return;
    }

    setIsLoading(true);
    const result = await updateUserProfile(
      firstName.trim(),
      lastName.trim(),
      pronouns ?? undefined
    );
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>Let your community know who you are</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#BE9B51"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="#BE9B51"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isLoading}
          />

          <Text style={styles.pronounsLabel}>Your pronouns <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.pronounsRow}>
            {PRONOUN_OPTIONS.map((option) => {
              const isSelected = pronouns === option.value;
              return (
                <TouchableOpacity
                  key={option.value || 'none'}
                  style={[styles.pronounPill, isSelected && styles.pronounPillActive]}
                  onPress={() => setPronouns(isSelected ? null : option.value)}
                  disabled={isLoading}
                >
                  <Text style={[styles.pronounPillText, isSelected && styles.pronounPillTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7E6',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00934E',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Futura',
  },
  subtitle: {
    fontSize: 16,
    color: '#545454',
    textAlign: 'center',
    marginBottom: 36,
    fontFamily: 'Futura',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#FFF7E6',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7E0D3',
    color: '#545454',
    fontFamily: 'Futura',
  },
  pronounsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#545454',
    marginBottom: 10,
    marginTop: 4,
    fontFamily: 'Futura',
  },
  optional: {
    fontWeight: '400',
    color: '#BE9B51',
    fontSize: 13,
  },
  pronounsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  pronounPill: {
    borderWidth: 1,
    borderColor: '#E7E0D3',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF7E6',
  },
  pronounPillActive: {
    backgroundColor: '#00934E',
    borderColor: '#00934E',
  },
  pronounPillText: {
    fontSize: 14,
    color: '#545454',
    fontFamily: 'Futura',
  },
  pronounPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#00934E',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Futura',
  },
});
