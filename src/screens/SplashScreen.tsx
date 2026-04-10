import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';

interface SplashScreenProps {
  navigation: any;
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/cozy_app_tile.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Cozy Circle</Text>
        <Text style={styles.subtitle}>
          Sparking in-person connection{'\n'}and community engagement
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.createAccountText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7E6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Futura',
    color: '#00934E',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#545454',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#0277BB',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Futura',
    color: '#FFFFFF',
  },
  createAccountText: {
    fontSize: 16,
    fontFamily: 'Futura',
    color: '#00934E',
    textAlign: 'center',
    fontWeight: '600',
  },
});
