import React from 'react';
import { MicIcon } from './icons';

interface RecordButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  isBusy?: boolean;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isListening,
  onStart,
  onStop,
  disabled = false,
  isBusy = false,
}) => {
  const handleClick = () => {
    if (disabled) {
      return;
    }

    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  const baseClasses = `
    relative w-20 h-20 rounded-full flex items-center justify-center 
    text-white transition-all duration-300 ease-in-out transform 
    focus:outline-none focus:ring-4 focus:ring-opacity-50
  `;

  const stateClasses = isBusy
    ? 'bg-blue-500 shadow-md cursor-wait focus:ring-blue-400'
    : disabled
      ? 'bg-gray-400 cursor-not-allowed opacity-70'
      : isListening
        ? 'bg-red-500 shadow-lg scale-110 focus:ring-red-400'
        : 'bg-blue-500 shadow-md hover:bg-blue-600 focus:ring-blue-400';

  const buttonClasses = `${baseClasses} ${stateClasses}`;
  const pulseClass = isListening ? 'animate-pulse' : '';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={buttonClasses}
      aria-label={isListening ? 'Detener grabación' : 'Iniciar grabación'}
      disabled={disabled}
      aria-disabled={disabled}
      aria-pressed={isListening}
      aria-busy={isBusy}
    >
      {isBusy && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
        </div>
      )}
      <div className={`${pulseClass} transition-opacity duration-200 ${isBusy ? 'opacity-0' : 'opacity-100'}`}>
        <MicIcon />
      </div>
    </button>
  );
};