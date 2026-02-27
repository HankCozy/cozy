import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';

export const CIRCLE_COLORS = [
  '#60A5FA', // blue
  '#34D399', // green
  '#F87171', // coral
  '#A78BFA', // purple
  '#FBBF24', // amber
  '#F472B6', // pink
  '#2DD4BF', // teal
  '#FB923C', // orange
];

const MAX_CHART_CIRCLES = 5;
const CANVAS_HEIGHT = 280;
const MIN_RADIUS = 28;
const MAX_RADIUS = 80;
const GAP = 10;

interface CircleOverview {
  id: string;
  name: string;
  count: number;
}

interface BubbleData {
  circle: CircleOverview;
  color: string;
  x: number;
  y: number;
  r: number;
}

interface Props {
  circles: CircleOverview[];
  onPress: (circle: CircleOverview) => void;
}

function packBubbles(circles: CircleOverview[], canvasW: number): BubbleData[] {
  if (circles.length === 0) return [];

  const maxCount = Math.max(...circles.map((c) => c.count));

  function computeRadius(count: number): number {
    // Linear scaling: radius proportional to count, giving clear visual size differences
    const scale = count / maxCount;
    return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * scale;
  }

  // Sort by count descending, take top N
  const sorted = [...circles].sort((a, b) => b.count - a.count).slice(0, MAX_CHART_CIRCLES);

  const primary = sorted[0];
  const primaryR = computeRadius(primary.count);
  const others = sorted.slice(1);

  // Place in logical coordinates centered at origin
  const logical: BubbleData[] = [
    { circle: primary, color: CIRCLE_COLORS[0], x: 0, y: 0, r: primaryR },
  ];

  if (others.length > 0) {
    const angleStep = (2 * Math.PI) / others.length;
    others.forEach((circle, i) => {
      const r = computeRadius(circle.count);
      const angle = -Math.PI / 2 + angleStep * i; // start from top
      const distance = primaryR + r + GAP;
      logical.push({
        circle,
        color: CIRCLE_COLORS[(i + 1) % CIRCLE_COLORS.length],
        x: distance * Math.cos(angle),
        y: distance * Math.sin(angle),
        r,
      });
    });
  }

  // Bounding box (no label space — text is inside the bubble now)
  const minX = Math.min(...logical.map((b) => b.x - b.r));
  const maxX = Math.max(...logical.map((b) => b.x + b.r));
  const minY = Math.min(...logical.map((b) => b.y - b.r));
  const maxY = Math.max(...logical.map((b) => b.y + b.r));

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const padding = 12;
  const availW = canvasW - 2 * padding;
  const availH = CANVAS_HEIGHT - 2 * padding;

  // Scale down to fit if needed, never scale up
  const scale = Math.min(availW / contentW, availH / contentH, 1);

  const translateX = canvasW / 2 - ((minX + maxX) / 2) * scale;
  const translateY = CANVAS_HEIGHT / 2 - ((minY + maxY) / 2) * scale;

  return logical.map((b) => ({
    ...b,
    x: b.x * scale + translateX,
    y: b.y * scale + translateY,
    r: Math.max(b.r * scale, MIN_RADIUS),
  }));
}

export default function CircleBubbleChart({ circles, onPress }: Props) {
  const canvasW = Dimensions.get('window').width - 40;
  const bubbles = packBubbles(circles, canvasW);

  const scaleAnims = useRef(
    Array.from({ length: Math.min(circles.length, MAX_CHART_CIRCLES) }, () => new Animated.Value(0))
  );

  useEffect(() => {
    while (scaleAnims.current.length < bubbles.length) {
      scaleAnims.current.push(new Animated.Value(0));
    }
    scaleAnims.current.slice(0, bubbles.length).forEach((anim) => anim.setValue(0));

    Animated.stagger(
      80,
      scaleAnims.current.slice(0, bubbles.length).map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [circles.length]);

  if (bubbles.length === 0) return null;

  return (
    <View style={{ height: CANVAS_HEIGHT, position: 'relative' }}>
      {bubbles.map((bubble, i) => {
        const { circle, color, x, y, r } = bubble;
        const fontSize = r > 58 ? 14 : r > 46 ? 12 : 10;

        if (i >= scaleAnims.current.length) return null;

        return (
          <Animated.View
            key={circle.id}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              transform: [{ scale: scaleAnims.current[i] }],
            }}
          >
            <TouchableOpacity
              onPress={() => onPress(circle)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel={`${circle.name} circle with ${circle.count} members`}
              accessibilityRole="button"
              style={{ flex: 1 }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: r,
                  backgroundColor: color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  overflow: 'hidden',
                }}
              >
                <Text
                  style={{
                    fontSize,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    lineHeight: fontSize * 1.35,
                  }}
                  numberOfLines={3}
                >
                  {circle.name}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}
