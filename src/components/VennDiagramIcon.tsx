import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface VennDiagramIconProps {
  size?: number;
  color?: string;
}

export default function VennDiagramIcon({ size = 24, color = '#000' }: VennDiagramIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx="9.5"
        cy="12"
        r="5"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Circle
        cx="14.5"
        cy="12"
        r="5"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  );
}
