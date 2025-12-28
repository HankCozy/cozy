import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OnboardingGraphic() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>📱✨</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 120,
  },
});
