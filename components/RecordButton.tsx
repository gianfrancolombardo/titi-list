import React from 'react';
import { MicIcon } from './icons';

interface RecordButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ isListening, onStart, onStop }) => {
  const handleClick = () => {
    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  const buttonClasses = `
    w-20 h-20 rounded-full flex items-center justify-center 
    text-white transition-all duration-300 ease-in-out transform 
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    ${isListening 
      ? 'bg-red-500 shadow-lg scale-110 focus:ring-red-400' 
      : 'bg-blue-500 shadow-md hover:bg-blue-600 focus:ring-blue-400'
    }
  `;
  
  const pulseClass = isListening ? 'animate-pulse' : '';

  return (
    <button onClick={handleClick} className={buttonClasses} aria-label={isListening ? 'Detener grabación' : 'Iniciar grabación'}>
      <div className={pulseClass}>
          <MicIcon />
      </div>
    </button>
  );
};