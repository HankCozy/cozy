import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';

export const CIRCLE_COLORS = [
  '#FE6627', // orange — center circle
  '#0277BB', // blue
  '#FFA0A6', // pink
  '#00934E', // green
  '#FAC63D', // yellow
  '#0277BB', // blue (repeat for 6th+)
  '#FFA0A6', // pink (repeat)
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
    // Organic start offset + per-index jitter — avoids 0°/90°/180°/270° placements
    const startOffset = 0.65;
    const jitters = [0.18, -0.22, 0.31, -0.15, 0.27, -0.19];
    others.forEach((circle, i) => {
      const r = computeRadius(circle.count);
      const angle = startOffset + angleStep * i + (jitters[i % jitters.length]);
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

// Estimate rendered width of an uppercase Futura label at a given font size
function estimateLabelWidth(name: string, fontSize: number): number {
  return name.length * fontSize * 0.62 + 8;
}

interface LabelLayout {
  x: number;
  y: number;
  fontSize: number;
  textColor: string;
  isInside: boolean;
}

function computeLabelLayout(bubbles: BubbleData[]): LabelLayout[] {
  const labels: (LabelLayout & { width: number; height: number })[] = bubbles.map((b) => {
    const name = (b.circle.shortName ?? b.circle.name).toUpperCase();
    const fontSize = Math.max(9, Math.min(14, b.r * 0.24));
    const labelW = estimateLabelWidth(name, fontSize);
    const isInside = labelW < b.r * 1.75;
    return {
      x: b.x,
      y: isInside ? b.y : b.y + b.r + fontSize + 2,
      fontSize,
      textColor: isInside ? '#FFFFFF' : b.color,
      isInside,
      width: labelW,
      height: fontSize * 1.4,
    };
  });

  // Iterative vertical collision resolution — labels never overlap
  for (let iter = 0; iter < 50; iter++) {
    let changed = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 4;
        const overlapY = Math.abs(a.y - b.y) < (a.height + b.height) / 2 + 3;
        if (overlapX && overlapY) {
          const push = ((a.height + b.height) / 2 + 3 - Math.abs(a.y - b.y)) / 2 + 1;
          if (a.y <= b.y) { labels[i].y -= push; labels[j].y += push; }
          else             { labels[i].y += push; labels[j].y -= push; }
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return labels;
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

  const labelLayouts = computeLabelLayout(separatedBubbles);

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
                }}
              />
            </TouchableOpacity>
          </Animated.View>
          </Animated.View>
        );
      })}

      {/* Label layer — rendered above circles, never overlaps */}
      {!showOverlap && labelLayouts.map((label, i) => {
        if (i >= separatedBubbles.length) return null;
        const bubble = separatedBubbles[i];
        const name = (bubble.circle.shortName ?? bubble.circle.name).toUpperCase();
        const labelW = estimateLabelWidth(name, label.fontSize);
        return (
          <Text
            key={`label-${bubble.circle.id}`}
            style={{
              position: 'absolute',
              left: label.x - labelW / 2,
              top: label.y - label.fontSize * 0.7,
              width: labelW,
              fontSize: label.fontSize,
              color: label.textColor,
              fontFamily: 'Futura',
              fontWeight: '700',
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
        );
      })}
    </View>
  );
}
