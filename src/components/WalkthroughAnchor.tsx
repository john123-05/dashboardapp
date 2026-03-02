import { useEffect, useRef, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useWalkthrough } from '../contexts/WalkthroughContext';

interface WalkthroughAnchorProps extends PropsWithChildren {
  id: string;
}

export function WalkthroughAnchor({ id, children }: WalkthroughAnchorProps) {
  const ref = useRef<View | null>(null);
  const { registerAnchor, unregisterAnchor, visible } = useWalkthrough();

  function measure() {
    if (!ref.current) return;
    ref.current.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      registerAnchor(id, { x, y, width, height });
    });
  }

  useEffect(() => {
    measure();
  }, [visible]);

  useEffect(() => {
    return () => unregisterAnchor(id);
  }, [id, unregisterAnchor]);

  return (
    <View
      ref={ref}
      onLayout={() => {
        requestAnimationFrame(measure);
      }}
      collapsable={false}
    >
      {children}
    </View>
  );
}
