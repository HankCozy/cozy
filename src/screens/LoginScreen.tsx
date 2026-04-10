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

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const result = await login(formData.email, formData.password);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Please try again');
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
              onPress={() => navigation.goBack()}
            >
              <Feather name="chevron-left" size={24} color="#545454" />
            </TouchableOpacity>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your community</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
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
                Password
              </Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={handlePasswordChange}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                textContentType="none"
              />
              <View style={styles.requirementContainer}>
                {passwordValid === true && (
                  <Feather name="check-circle" size={14} color="#10b981" style={styles.checkFeather} />
                )}
                <Text style={[
                  styles.requirementText,
                  passwordValid === true && styles.requirementTextValid
                ]}>
                  Minimum 12 characters
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Join with invitation code</Text>
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
  labelValid: {
    color: '#00934E',
    fontWeight: 'bold',
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
  validationMessage: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E7E0D3',
    borderRadius: 10,
  },
  validText: {
    fontSize: 14,
    color: '#00934E',
  },
  invalidText: {
    fontSize: 14,
    color: '#FE6627',
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