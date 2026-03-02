import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useI18n } from '../contexts/LanguageContext';
import { useAppTheme } from '../contexts/ThemeContext';

interface RevenuePoint {
  date: string;
  amount: number;
}

interface RevenueLineChartProps {
  rows: RevenuePoint[];
}

export function RevenueLineChart({ rows }: RevenueLineChartProps) {
  const { t, language } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [chartWidth, setChartWidth] = useState(0);
  const lineReveal = useRef(new Animated.Value(0)).current;

  const chartRows = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30),
    [rows]
  );

  const chartData = useMemo(() => {
    if (chartRows.length === 0 || chartWidth === 0) return null;

    const chartHeight = 180;
    const topPad = 10;
    const rightPad = 10;
    const bottomPad = 24;
    const leftPad = 8;
    const plotWidth = Math.max(chartWidth - leftPad - rightPad, 1);
    const plotHeight = Math.max(chartHeight - topPad - bottomPad, 1);
    const maxAmount = Math.max(...chartRows.map((row) => row.amount), 1);

    const points = chartRows.map((row, index) => {
      const progress = chartRows.length === 1 ? 0.5 : index / (chartRows.length - 1);
      return {
        x: leftPad + progress * plotWidth,
        y: topPad + (1 - row.amount / maxAmount) * plotHeight,
      };
    });

    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${topPad + plotHeight} L ${points[0].x} ${topPad + plotHeight} Z`;
    const yTicks = [1, 0.75, 0.5, 0.25, 0];
    const xLabelCount = Math.min(6, chartRows.length);
    const xLabelIndexes = Array.from({ length: xLabelCount }, (_, index) =>
      Math.round((index * (chartRows.length - 1)) / Math.max(xLabelCount - 1, 1))
    );

    return {
      chartHeight,
      topPad,
      plotHeight,
      linePath,
      areaPath,
      yTicks,
      xLabelIndexes,
    };
  }, [chartRows, chartWidth]);

  const animatedChartWidth = lineReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, chartWidth],
  });

  useEffect(() => {
    if (!chartData) return;
    lineReveal.setValue(0);
    Animated.timing(lineReveal, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [chartData, lineReveal]);

  if (chartRows.length === 0) {
    return <Text style={styles.emptyText}>{t('revenue_no_data')}</Text>;
  }

  return (
    <View
      style={styles.chartWrap}
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth !== chartWidth) setChartWidth(nextWidth);
      }}
    >
      {chartData ? (
        <>
          <Animated.View style={[styles.chartAnimatedLayer, { width: animatedChartWidth }]}>
            <Svg width={chartWidth} height={chartData.chartHeight}>
              {chartData.yTicks.map((tick) => {
                const y = chartData.topPad + (1 - tick) * chartData.plotHeight;
                return (
                  <Path
                    key={`grid-${tick}`}
                    d={`M 0 ${y} L ${chartWidth} ${y}`}
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                );
              })}

              <Defs>
                <LinearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={colors.dataBlue} stopOpacity="0.32" />
                  <Stop offset="100%" stopColor={colors.dataBlue} stopOpacity="0.03" />
                </LinearGradient>
              </Defs>

              <Path d={chartData.areaPath} fill="url(#revenueArea)" />
              <Path d={chartData.linePath} fill="none" stroke={colors.dataBlue} strokeWidth={2.5} />
            </Svg>
          </Animated.View>

          <View style={styles.xLabelRow}>
            {chartData.xLabelIndexes.map((index) => (
              <Text key={`x-${index}`} style={styles.xLabel}>
                {new Date(chartRows[index].date).toLocaleDateString(language, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (colors: { muted: string; border: string; dataBlue: string }) =>
  StyleSheet.create({
    chartWrap: {
      marginTop: 4,
      minHeight: 212,
    },
    chartAnimatedLayer: {
      overflow: 'hidden',
      borderRadius: 10,
    },
    xLabelRow: {
      marginTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
    },
    xLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '500',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
    },
  });
