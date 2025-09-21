import React, { useCallback, useState } from 'react';

type Size = 'sm' | 'md' | 'lg';

export interface BubbleMarkerProps {
  attributeId: string;
  onClick?: (id: string) => void;
  size?: Size;
  position?: { x: number; y: number };
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const BubbleMarker: React.FC<BubbleMarkerProps> = ({
  attributeId,
  onClick,
  size = 'md',
  position,
  className = '',
}) => {
  const [imgHidden, setImgHidden] = useState(false);

  const handleActivate = useCallback(() => {
    if (onClick) onClick(attributeId);
  }, [onClick, attributeId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  const style: React.CSSProperties | undefined = position
    ? {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }
    : undefined;

  const baseClasses = [
    'rounded-full',
    'shadow-md',
    'flex items-center justify-center',
    'cursor-pointer',
    'border',
    'touch-manipulation',
    'min-w-touch min-h-touch',
    sizeClasses[size],
    position ? 'absolute' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type='button'
      tabIndex={0}
      aria-label={`${attributeId} attribute marker`}
      className={baseClasses}
      style={style}
      onClick={handleActivate}
      onKeyDown={onKeyDown}
    >
      <img
        src={`/icons/${attributeId}-attribute.png`}
        alt={`${attributeId} attribute icon`}
        style={imgHidden ? { display: 'none' } : undefined}
        onError={() => setImgHidden(true)}
        draggable={false}
      />
    </button>
  );
};

export default BubbleMarker;
