import { forwardRef, Fragment } from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient, Polygon, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';
import { DISPLAY_W, estimateText, splitColor, starPoints, TEXT_LINE, type El, type RectEl, type TextEl } from '../../lib/overlayModel';

export type Measured = Record<string, { w: number; h: number }>;

/** Größe eines Elements im Entwurfsraster (Text: gemessen, inklusive Hintergrund-Innenabstand). */
export function boxOf(el: El, measured: Measured): { w: number; h: number } {
  if (el.type === 'text') {
    const m = measured[el.id] ?? estimateText(el);
    const pad = el.bgColor ? el.bgPadding * 2 : 0;
    return { w: m.w + pad, h: m.h + pad };
  }
  if (el.type === 'line') return { w: el.width, h: el.strokeWidth };
  return { w: el.width, h: el.height };
}

const GRAD: Record<RectEl['gradientDir'], [string, string, string, string]> = {
  down: ['0', '0', '0', '1'],
  up: ['0', '1', '0', '0'],
  right: ['0', '0', '1', '0'],
  left: ['1', '0', '0', '0'],
};

function TextBody({ el, w, h }: { el: TextEl; w: number; h: number }) {
  const pad = el.bgColor ? el.bgPadding : 0;
  const tw = w - pad * 2;
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
  const ax = el.x + pad + (el.align === 'center' ? tw / 2 : el.align === 'right' ? tw : 0);
  const lines = el.text.split('\n');
  const first = el.y + pad + el.fontSize * 0.93;
  const common = {
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontWeight: String(el.fontWeight) as '400',
    fontStyle: el.italic ? ('italic' as const) : ('normal' as const),
    letterSpacing: el.letterSpacing,
    textAnchor: anchor as 'start',
  };
  const spans = lines.map((line, i) => (
    <TSpan key={i} x={ax} y={first + i * el.fontSize * TEXT_LINE}>
      {line || ' '}
    </TSpan>
  ));
  const bg = el.bgColor ? splitColor(el.bgColor) : null;
  const fill = splitColor(el.fill);
  return (
    <>
      {bg ? <Rect x={el.x} y={el.y} width={w} height={h} rx={6} fill={bg.color} fillOpacity={bg.opacity} /> : null}
      {el.shadow ? (
        <SvgText {...common} fill="#000000" fillOpacity={0.45} transform={`translate(1, 1.5)`}>
          {spans}
        </SvgText>
      ) : null}
      {el.strokeWidth > 0 ? (
        <SvgText {...common} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinejoin="round">
          {spans}
        </SvgText>
      ) : null}
      <SvgText {...common} fill={fill.color} fillOpacity={fill.opacity}>
        {spans}
      </SvgText>
    </>
  );
}

function Body({ el, measured }: { el: El; measured: Measured }) {
  const { w, h } = boxOf(el, measured);
  switch (el.type) {
    case 'text':
      return <TextBody el={el} w={w} h={h} />;
    case 'rect': {
      const f = splitColor(el.fill);
      const sw = el.strokeWidth;
      return (
        <>
          {el.gradientTo ? (
            <Defs>
              <LinearGradient id={`g-${el.id}`} x1={GRAD[el.gradientDir][0]} y1={GRAD[el.gradientDir][1]} x2={GRAD[el.gradientDir][2]} y2={GRAD[el.gradientDir][3]}>
                <Stop offset="0" stopColor={f.color} stopOpacity={f.opacity} />
                <Stop offset="1" stopColor={splitColor(el.gradientTo).color} stopOpacity={splitColor(el.gradientTo).opacity} />
              </LinearGradient>
            </Defs>
          ) : null}
          <Rect x={el.x} y={el.y} width={w} height={h} rx={el.radius} fill={el.gradientTo ? `url(#g-${el.id})` : f.color} fillOpacity={el.gradientTo ? 1 : f.opacity} />
          {sw > 0 ? <Rect x={el.x + sw / 2} y={el.y + sw / 2} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} rx={Math.max(0, el.radius - sw / 2)} fill="none" stroke={el.stroke} strokeWidth={sw} /> : null}
        </>
      );
    }
    case 'ellipse': {
      const f = splitColor(el.fill);
      return (
        <>
          <Ellipse cx={el.x + w / 2} cy={el.y + h / 2} rx={w / 2} ry={h / 2} fill={f.color} fillOpacity={f.opacity} />
          {el.strokeWidth > 0 ? <Ellipse cx={el.x + w / 2} cy={el.y + h / 2} rx={Math.max(0, w / 2 - el.strokeWidth / 2)} ry={Math.max(0, h / 2 - el.strokeWidth / 2)} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} /> : null}
        </>
      );
    }
    case 'frame':
      return <Rect x={el.x + el.strokeWidth / 2} y={el.y + el.strokeWidth / 2} width={Math.max(0, w - el.strokeWidth)} height={Math.max(0, h - el.strokeWidth)} rx={el.radius} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} />;
    case 'line':
      return <Rect x={el.x} y={el.y} width={w} height={h} fill={el.stroke} />;
    case 'triangle':
    case 'star': {
      const pts = el.type === 'triangle' ? ([[w / 2, 0], [w, h], [0, h]] as [number, number][]) : starPoints(w, h);
      return <Polygon points={pts.map(([px, py]) => `${el.x + px},${el.y + py}`).join(' ')} fill={el.fill} />;
    }
    case 'image':
      return (
        <>
          <Defs>
            <ClipPath id={`c-${el.id}`}>
              <Rect x={el.x} y={el.y} width={w} height={h} rx={el.radius} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#c-${el.id})`}>
            <G transform={el.flipX ? `matrix(-1,0,0,1,${2 * el.x + w},0)` : undefined}>
              <SvgImage href={{ uri: el.src }} x={el.x} y={el.y} width={w} height={h} preserveAspectRatio="none" />
            </G>
          </G>
        </>
      );
  }
}

/** Alle sichtbaren Elemente als SVG im Entwurfsraster (0..DISPLAY_W). */
export const OverlaySvg = forwardRef<any, { els: El[]; measured: Measured; height: number; width: number; designHeight: number }>(function OverlaySvg({ els, measured, width, height, designHeight }, ref) {
  return (
    <Svg ref={ref} width={width} height={height} viewBox={`0 0 ${DISPLAY_W} ${designHeight}`}>
      {els
        .filter((el) => !el.hidden)
        .map((el) => {
          const { w, h } = boxOf(el, measured);
          return (
            <G key={el.id} opacity={el.opacity} rotation={el.rotation || 0} origin={`${el.x + w / 2}, ${el.y + h / 2}`}>
              <Fragment>
                <Body el={el} measured={measured} />
              </Fragment>
            </G>
          );
        })}
    </Svg>
  );
});
