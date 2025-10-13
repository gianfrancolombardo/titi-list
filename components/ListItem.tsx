import React from 'react';
import { Item, ItemType } from '../types';
import { QUADRANT_DETAILS } from '../constants';
import { TrashIcon } from './icons';

interface ListItemProps {
  item: Item;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ListItem: React.FC<ListItemProps> = ({ item, onToggleDone, onDelete }) => {
  const isShopping = item.type === ItemType.Shopping;
  const quadrantDetails = item.quadrant ? QUADRANT_DETAILS[item.quadrant] : null;

  const baseClasses = "flex items-center p-3 rounded-lg shadow-sm transition-all duration-200";
  const stateClasses = item.done 
    ? "bg-gray-100 text-gray-400" 
    : "bg-white";

  return (
    <div className={`${baseClasses} ${stateClasses}`}>
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggleDone(item.id)}
        className="h-5 w-5 rounded-md border-gray-300 focus:ring-blue-400 accent-blue-500"
      />
      <div className="flex-grow ml-3">
        <p className={`font-medium ${item.done ? 'line-through' : ''}`}>{item.title}</p>
        {(item.quantity || item.note) && (
          <p className="text-sm text-gray-500">{item.quantity} {item.note}</p>
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
  );
};