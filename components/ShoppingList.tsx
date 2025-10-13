import React, { useState, useMemo } from 'react';
import { Item } from '../types';
import { ListItem } from './ListItem';
import { ChevronDownIcon, ShoppingCartIcon } from './icons';

interface ShoppingListProps {
  items: Item[];
  allItems: Item[];
  onToggleDone: (id: string, currentDone: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  itemsTimeRemaining: Map<string, number>;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, allItems, onToggleDone, onDelete, itemsTimeRemaining }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);

  const activeItems = useMemo(() => items.filter(item => !item.done), [items]);
  const purchasedItems = useMemo(() => items.filter(item => item.done), [items]);
  
  // Calculate counters for title
  const undoneCount = useMemo(() => allItems.filter(item => !item.done).length, [allItems]);
  const totalCount = allItems.length;

  if (items.length === 0) return null;

  return (
    <section>
      <button 
        className="w-full flex items-center justify-between text-left text-xl font-semibold text-gray-600 mb-2 py-2"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center">
            <ShoppingCartIcon />
            <h2 className="ml-2">
              Lista de Compras
              {totalCount > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({undoneCount}/{totalCount})
                </span>
              )}
            </h2>
        </div>
        <ChevronDownIcon className={`transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="flex flex-col gap-2">
            {activeItems.length === 0 && purchasedItems.length > 0 && (
                <p className="text-gray-400 text-sm italic px-2">¡Todo comprado! Buen trabajo.</p>
            )}
            {activeItems.map(item => (
                <ListItem 
                  key={item.id} 
                  item={item} 
                  onToggleDone={onToggleDone} 
                  onDelete={onDelete} 
                  timeRemaining={itemsTimeRemaining.get(item.id)}
                />
            ))}

            {purchasedItems.length > 0 && (
                <div className="mt-2">
                    <button onClick={() => setShowPurchased(!showPurchased)} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1">
                        {showPurchased ? 'Ocultar' : 'Mostrar'} {purchasedItems.length} producto(s) comprado(s)
                    </button>
                    {showPurchased && (
                        <div className="flex flex-col gap-2 mt-2">
                            {purchasedItems.map(item => (
                                <ListItem 
                                  key={item.id} 
                                  item={item} 
                                  onToggleDone={onToggleDone} 
                                  onDelete={onDelete} 
                                  timeRemaining={itemsTimeRemaining.get(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
    </section>
  );
};
