import React, { useState, useMemo } from 'react';
import { Item, Quadrant } from '../types';
import { ListItem } from './ListItem';
import { QUADRANT_DETAILS } from '../constants';
import { CheckSquareIcon, ChevronDownIcon } from './icons';

interface TodoListProps {
  items: Item[];
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({ items, onToggleDone, onDelete }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const quadrant = item.quadrant || Quadrant.NotUrgentNotImportant;
      if (!acc[quadrant]) {
        acc[quadrant] = [];
      }
      acc[quadrant].push(item);
      return acc;
    }, {} as Record<Quadrant, Item[]>);
  }, [items]);
  
  const quadrantOrder: Quadrant[] = [
      Quadrant.UrgentImportant,
      Quadrant.UrgentNotImportant,
      Quadrant.NotUrgentImportant,
      Quadrant.NotUrgentNotImportant
  ];

  if (items.length === 0) return null;

  return (
    <section>
      <button 
        className="w-full flex items-center justify-between text-left text-xl font-semibold text-gray-600 mb-2 py-2"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center">
            <CheckSquareIcon />
            <h2 className="ml-2">Lista de Tareas</h2>
        </div>
        <ChevronDownIcon className={`transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="flex flex-col gap-4">
          {quadrantOrder.map(quadrant => {
            const quadrantItems = groupedItems[quadrant] || [];
            if (quadrantItems.length === 0) return null;
            
            const details = QUADRANT_DETAILS[quadrant];

            return (
              <div key={quadrant}>
                <h3 className={`text-sm font-medium ${details.textColor} px-2 mb-1`}>{details.label}</h3>
                <div className="flex flex-col gap-2">
                    {quadrantItems.map(item => (
                        <ListItem key={item.id} item={item} onToggleDone={onToggleDone} onDelete={onDelete} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};