import { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-700 border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div
        className={`
          absolute ${positionClasses[position]} z-50
          px-2 py-1 text-xs text-white bg-gray-700 rounded shadow-lg
          whitespace-nowrap pointer-events-none
          opacity-0 group-hover/tooltip:opacity-100
          transition-opacity duration-150
        `}
      >
        {content}
        <div
          className={`
            absolute ${arrowClasses[position]}
            border-4
          `}
        />
      </div>
    </div>
  );
}
