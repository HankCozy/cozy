import { Platform } from 'react-native';

export const Colors = {
  pink: '#FFA0A6',
  orange: '#FE6627',
  green: '#00934E',
  blue: '#0277BB',
  yellow: '#FAC63D',
  warmWhite: '#FFF7E6',
  black: '#444444',
  // Neutrals
  gray: '#6B7280',
  grayLight: '#D1D5DB',
  grayLighter: '#E5E7EB',
  grayBackground: '#f3f4f6',
  white: '#ffffff',
};

export const Fonts = {
  regular: Platform.select({ ios: 'Futura', android: 'sans-serif' }),
  medium: Platform.select({ ios: 'Futura-Medium', android: 'sans-serif-medium' }),
  bold: Platform.select({ ios: 'Futura-Bold', android: 'sans-serif' }),
};
