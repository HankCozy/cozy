import React, { useEffect, useRef, useState } from 'react';
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

const MAX_CHART_CIRCLES = 6;
const CANVAS_HEIGHT = 360;
const MIN_RADIUS = 32;
const MAX_RADIUS = 80;
const GAP = 4;

interface CircleOverview {
  id: string;
  name: string;
  shortName?: string;
  memberIds?: string[];
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
  showOverlap?: boolean;
}

function packBubbles(circles: CircleOverview[], canvasW: number): BubbleData[] {
  if (circles.length === 0) return [];

  const maxCount = Math.max(...circles.map((c) => c.count));

  function computeRadius(count: number): number {
    const scale = count / maxCount;
    return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * scale;
  }

  const sorted = [...circles].sort((a, b) => b.count - a.count).slice(0, MAX_CHART_CIRCLES);

  const primary = sorted[0];
  const primaryR = computeRadius(primary.count);
  const others = sorted.slice(1);

  const logical: BubbleData[] = [
    { circle: primary, color: CIRCLE_COLORS[0], x: 0, y: 0, r: primaryR },
  ];

  if (others.length > 0) {
    const angleStep = (2 * Math.PI) / others.length;
    others.forEach((circle, i) => {
      const r = computeRadius(circle.count);
      const angle = -Math.PI / 2 + angleStep * i;
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

  const minX = Math.min(...logical.map((b) => b.x - b.r));
  const maxX = Math.max(...logical.map((b) => b.x + b.r));
  const minY = Math.min(...logical.map((b) => b.y - b.r));
  const maxY = Math.max(...logical.map((b) => b.y + b.r));

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const padding = 8;
  const availW = canvasW - 2 * padding;
  const availH = CANVAS_HEIGHT - 2 * padding;

  const scale = Math.min(availW / contentW, availH / contentH);

  const translateX = canvasW / 2 - ((minX + maxX) / 2) * scale;
  const translateY = CANVAS_HEIGHT / 2 - ((minY + maxY) / 2) * scale;

  return logical.map((b) => ({
    ...b,
    x: b.x * scale + translateX,
    y: b.y * scale + translateY,
    r: Math.max(b.r * scale, MIN_RADIUS),
  }));
}

function getOverlapFraction(a: CircleOverview, b: CircleOverview): number {
  if (!a.memberIds?.length || !b.memberIds?.length) return 0;
  const setA = new Set(a.memberIds);
  const shared = b.memberIds.filter(id => setA.has(id)).length;
  return shared / Math.min(a.count, b.count);
}

function computeOverlapLayout(bubbles: BubbleData[], canvasW: number): Array<{x: number, y: number}> {
  const N = bubbles.length;
  const pos = bubbles.map(b => ({ x: b.x, y: b.y }));

  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const fraction = getOverlapFraction(bubbles[i].circle, bubbles[j].circle);
        const target = (bubbles[i].r + bubbles[j].r) * Math.max(0.2, 1.4 - fraction * 1.2);
        const correction = ((dist - target) / dist) * 0.15;
        pos[i].x += dx * correction * 0.5;
        pos[i].y += dy * correction * 0.5;
        pos[j].x -= dx * correction * 0.5;
        pos[j].y -= dy * correction * 0.5;
      }
    }
    // Gentle centering to prevent drift
    pos.forEach(p => { p.x *= 0.997; p.y *= 0.997; });
  }

  // Fit bounding box to canvas
  const padding = 8;
  const xs = pos.flatMap((p, i) => [p.x - bubbles[i].r, p.x + bubbles[i].r]);
  const ys = pos.flatMap((p, i) => [p.y - bubbles[i].r, p.y + bubbles[i].r]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((canvasW - 2 * padding) / (maxX - minX), (CANVAS_HEIGHT - 2 * padding) / (maxY - minY), 1);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return pos.map(p => ({
    x: (p.x - cx) * scale + canvasW / 2,
    y: (p.y - cy) * scale + CANVAS_HEIGHT / 2,
  }));
}

function BubbleLabel({ name }: { name: string }) {
  const [abbreviated, setAbbreviated] = useState(false);

  if (abbreviated) {
    return (
      <Text
        style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', textAlign: 'center' }}
        allowFontScaling={false}
      >
        {name.slice(0, 4) + '...'}
      </Text>
    );
  }

  return (
    <Text
      style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', textAlign: 'center' }}
      numberOfLines={2}
      allowFontScaling={false}
      onTextLayout={(e) => {
        if (e.nativeEvent.lines.length > 1) setAbbreviated(true);
      }}
    >
      {name}
    </Text>
  );
}

export default function CircleBubbleChart({ circles, onPress, showOverlap = false }: Props) {
  const canvasW = Dimensions.get('window').width - 40;
  const separatedBubbles = packBubbles(circles, canvasW);

  const scaleAnims = useRef(
    Array.from({ length: Math.min(circles.length, MAX_CHART_CIRCLES) }, () => new Animated.Value(0))
  );

  // x/y position anims — start at separated positions, animate when overlap toggles
  const posAnims = useRef<Array<{ x: Animated.Value; y: Animated.Value }>>([]);
  if (posAnims.current.length === 0) {
    posAnims.current = separatedBubbles.map((b) => ({
      x: new Animated.Value(b.x),
      y: new Animated.Value(b.y),
    }));
  }

  // Scale-in on mount / data change
  useEffect(() => {
    while (scaleAnims.current.length < separatedBubbles.length) {
      scaleAnims.current.push(new Animated.Value(0));
    }
    while (posAnims.current.length < separatedBubbles.length) {
      const b = separatedBubbles[posAnims.current.length];
      posAnims.current.push({ x: new Animated.Value(b.x), y: new Animated.Value(b.y) });
    }
    scaleAnims.current.slice(0, separatedBubbles.length).forEach((anim) => anim.setValue(0));
    separatedBubbles.forEach((b, i) => {
      posAnims.current[i].x.setValue(b.x);
      posAnims.current[i].y.setValue(b.y);
    });

    Animated.stagger(
      80,
      scaleAnims.current.slice(0, separatedBubbles.length).map((anim) =>
        Animated.spring(anim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true })
      )
    ).start();
  }, [circles.length]);

  // Animate positions when overlap toggles
  useEffect(() => {
    const targets = showOverlap
      ? computeOverlapLayout(separatedBubbles, canvasW)
      : separatedBubbles;
    Animated.parallel(
      targets.flatMap((b, i) => {
        if (i >= posAnims.current.length) return [];
        return [
          Animated.spring(posAnims.current[i].x, { toValue: b.x, tension: 100, friction: 10, useNativeDriver: false }),
          Animated.spring(posAnims.current[i].y, { toValue: b.y, tension: 100, friction: 10, useNativeDriver: false }),
        ];
      })
    ).start();
  }, [showOverlap]);

  if (separatedBubbles.length === 0) return null;

  return (
    <View style={{ height: CANVAS_HEIGHT, position: 'relative' }}>
      {separatedBubbles.map((bubble, i) => {
        const { circle, color, r } = bubble;

        if (i >= scaleAnims.current.length || i >= posAnims.current.length) return null;

        return (
          <Animated.View
            key={circle.id}
            style={{
              position: 'absolute',
              left: Animated.subtract(posAnims.current[i].x, r),
              top: Animated.subtract(posAnims.current[i].y, r),
              width: r * 2,
              height: r * 2,
            }}
          >
          <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnims.current[i] }] }}>
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
                  backgroundColor: color + 'B3', // 70% opacity — blends nicely when overlapping
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                }}
              >
                {!showOverlap && <BubbleLabel name={circle.shortName ?? circle.name} />}
              </View>
            </TouchableOpacity>
          </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
}
