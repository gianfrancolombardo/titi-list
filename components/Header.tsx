import React from 'react';
import { ListChecksIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-center text-center py-2">
        <ListChecksIcon />
        <h1 className="text-2xl font-bold text-gray-700 ml-2">Titi List</h1>
    </header>
  );
};