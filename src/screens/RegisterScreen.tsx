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
import { Feather } from '@expo/vector-icons';
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
      setIsLoading(false);
    } else {
      // Navigate to onboarding with credentials
      setIsLoading(false);
      navigation.navigate('Onboarding', {
        user: result.user,
        token: result.token
      });
    }
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
              onPress={() => navigation.goBack()}
            >
              <Feather name="chevron-left" size={24} color="#545454" />
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
                placeholderTextColor="#BE9B51"
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
                  placeholderTextColor="#BE9B51"
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
                  placeholderTextColor="#BE9B51"
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
                placeholderTextColor="#BE9B51"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={handlePasswordChange}
                placeholder="Create a password"
                placeholderTextColor="#BE9B51"
                secureTextEntry
                autoCapitalize="none"
                textContentType="none"
              />
              <View style={styles.requirementContainer}>
                {passwordValid === true && (
                  <Feather name="check-circle" size={14} color="#00934E" style={styles.checkFeather} />
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
                placeholderTextColor="#BE9B51"
                secureTextEntry
                autoCapitalize="none"
                textContentType="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
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
    backgroundColor: '#FFF7E6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
    paddingTop: 16,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 16,
    padding: 8,
    zIndex: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Futura',
    color: '#00934E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#545454',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
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
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Futura',
    color: '#545454',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E7E0D3',
    borderRadius: 20,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#FFF7E6',
    color: '#545454',
  },
  requirementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  checkFeather: {
    marginRight: 6,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: 'Futura',
    color: '#BE9B51',
  },
  requirementTextValid: {
    color: '#00934E',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#0277BB',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Futura',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Futura',
    color: '#545454',
  },
  link: {
    fontSize: 14,
    fontFamily: 'Futura',
    color: '#00934E',
    fontWeight: '600',
  },
});
