import React, { useState, useMemo } from 'react';
import { Item, Quadrant } from '../types';
import { ListItem } from './ListItem';
import { QUADRANT_DETAILS } from '../constants';
import { CheckSquareIcon, ChevronDownIcon } from './icons';

interface TodoListProps {
  items: Item[];
  allItems: Item[];
  onToggleDone: (id: string, currentDone: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  itemsTimeRemaining: Map<string, number>;
}

export const TodoList: React.FC<TodoListProps> = ({ items, allItems, onToggleDone, onDelete, itemsTimeRemaining }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate counters for title
  const undoneCount = useMemo(() => allItems.filter(item => !item.done).length, [allItems]);
  const totalCount = allItems.length;

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
        className="w-full flex items-center justify-between text-left text-xl font-semibold text-gray-600 mb-2 py-2 hover:bg-gray-50 rounded-lg transition-all duration-200 hover:scale-[1.01]"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center">
            <CheckSquareIcon />
            <h2 className="ml-2">
              Lista de Tareas
              {totalCount > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({undoneCount}/{totalCount})
                </span>
              )}
            </h2>
        </div>
        <ChevronDownIcon className={`transform transition-transform duration-300 ease-in-out ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="flex flex-col gap-4 animate-slideInFromTop">
          {quadrantOrder.map(quadrant => {
            const quadrantItems = groupedItems[quadrant] || [];
            if (quadrantItems.length === 0) return null;
            
            const details = QUADRANT_DETAILS[quadrant];

            return (
              <div key={quadrant}>
                <h3 className={`text-sm font-medium ${details.textColor} px-2 mb-1`}>{details.label}</h3>
                <div className="flex flex-col gap-2">
                    {quadrantItems.map(item => (
                        <ListItem 
                          key={item.id} 
                          item={item} 
                          onToggleDone={onToggleDone} 
                          onDelete={onDelete} 
                          timeRemaining={itemsTimeRemaining.get(item.id)}
                        />
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
