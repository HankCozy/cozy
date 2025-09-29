import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    invitationCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.invitationCode) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 12) {
      Alert.alert('Error', 'Password must be at least 12 characters');
      return;
    }

    setIsLoading(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      invitationCode: formData.invitationCode
    });

    if (!result.success) {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
    // On success, navigation will be handled by the auth flow
    setIsLoading(false);
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));

    if (password.length > 0) {
      setPasswordValid(password.length >= 12);
    } else {
      setPasswordValid(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Welcome')}
            >
              <Icon name="arrow-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.title}>Join Community</Text>
            <Text style={styles.subtitle}>Create your account with an invitation code</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invitation Code *</Text>
              <TextInput
                style={styles.input}
                value={formData.invitationCode}
                onChangeText={(code) => setFormData(prev => ({ ...prev, invitationCode: code }))}
                placeholder="Enter your invitation code"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(firstName) => setFormData(prev => ({ ...prev, firstName }))}
                  placeholder="First name"
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(lastName) => setFormData(prev => ({ ...prev, lastName }))}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(email) => setFormData(prev => ({ ...prev, email }))}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password *
              </Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={handlePasswordChange}
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                textContentType="none"
              />
              <View style={styles.requirementContainer}>
                {passwordValid === true && (
                  <Icon name="check-circle" size={14} color="#10b981" style={styles.checkIcon} />
                )}
                <Text style={[
                  styles.requirementText,
                  passwordValid === true && styles.requirementTextValid
                ]}>
                  Minimum 12 characters
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(confirmPassword) => setFormData(prev => ({ ...prev, confirmPassword }))}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                textContentType="none"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                isLoading && styles.buttonDisabled
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  inputValid: {
    borderColor: '#10b981',
  },
  inputInvalid: {
    borderColor: '#ef4444',
  },
  labelValid: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  requirementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkIcon: {
    marginRight: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  requirementTextValid: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  validationMessage: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
  },
  validText: {
    fontSize: 14,
    color: '#059669',
  },
  invalidText: {
    fontSize: 14,
    color: '#dc2626',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
});