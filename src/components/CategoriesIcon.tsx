import React from 'react';
import { View, StyleSheet } from 'react-native';

interface CategoriesIconProps {
  size?: number;
}

export default function CategoriesIcon({ size = 24 }: CategoriesIconProps) {
  const squareSize = (size - 4) / 2; // Gap of 4px between squares

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              backgroundColor: '#86efac',
              borderColor: '#22c55e',
            },
          ]}
        />
        <View
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              backgroundColor: '#f9a8d4',
              borderColor: '#ec4899',
            },
          ]}
        />
      </View>
      <View style={styles.row}>
        <View
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              backgroundColor: '#fdba74',
              borderColor: '#f97316',
            },
          ]}
        />
        <View
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              backgroundColor: '#93c5fd',
              borderColor: '#3b82f6',
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  square: {
    borderRadius: 3,
    borderWidth: 1.5,
  },
});
