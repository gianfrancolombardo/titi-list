import React from 'react';
import { Item, ItemType } from '../types';
import { QUADRANT_DETAILS } from '../constants';
import { TrashIcon } from './icons';

interface ListItemProps {
  item: Item;
  onToggleDone: (id: string, currentDone: boolean) => void;
  onDelete: (id: string) => void;
  timeRemaining?: number;
}

export const ListItem: React.FC<ListItemProps> = ({ item, onToggleDone, onDelete, timeRemaining }) => {
  const isShopping = item.type === ItemType.Shopping;
  const quadrantDetails = item.quadrant ? QUADRANT_DETAILS[item.quadrant] : null;

  const baseClasses = "flex items-center p-3 rounded-lg shadow-sm transition-all duration-200";
  const stateClasses = item.done 
    ? "bg-gray-100 text-gray-400" 
    : "bg-white";

  // Calculate visual feedback for completed items
  const getVisualFeedback = () => {
    if (!item.done || !timeRemaining) return {};
    
    const progress = (timeRemaining / 15000) * 100; // 15 seconds total
    const opacity = Math.max(0.3, progress / 100); // Minimum 30% opacity
    
    return {
      opacity,
      progress,
      isDisappearing: timeRemaining < 5000 // Last 5 seconds
    };
  };

  const visualFeedback = getVisualFeedback();

  return (
    <div className="relative">
      {/* Progress bar for completed items */}
      {item.done && timeRemaining && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${visualFeedback.isDisappearing ? 'bg-red-400' : 'bg-green-400'}`}
            style={{ width: `${visualFeedback.progress}%` }}
          />
        </div>
      )}
      
      <div 
        className={`${baseClasses} ${stateClasses} ${item.done && timeRemaining ? 'relative' : ''}`}
        style={visualFeedback.opacity ? { opacity: visualFeedback.opacity } : {}}
      >
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggleDone(item.id, item.done)}
          className="h-5 w-5 rounded-md border-gray-300 focus:ring-blue-400 accent-blue-500"
        />
        <div className="flex-grow ml-3">
          <p className={`font-medium ${item.done ? 'line-through' : ''}`}>{item.title}</p>
          {(item.quantity || item.note) && (
            <p className="text-sm text-gray-500">{item.quantity} {item.note}</p>
          )}
          {/* Show countdown in last 5 seconds */}
          {item.done && timeRemaining && visualFeedback.isDisappearing && (
            <p className="text-xs text-red-500 font-semibold">
              Desaparece en {Math.ceil(timeRemaining / 1000)}s
            </p>
          )}
        </div>

        {!isShopping && quadrantDetails && !item.done && (
           <span className={`text-xs font-semibold mr-3 px-2 py-1 rounded-full ${quadrantDetails.color} ${quadrantDetails.textColor}`}>
              {QUADRANT_DETAILS[item.quadrant!].label.split(',')[0]}
          </span>
        )}
        
        <button onClick={() => onDelete(item.id)} className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};
