import { Quadrant } from './types';

export const QUADRANT_DETAILS: Record<Quadrant, { label: string; color: string; textColor: string; borderColor: string; }> = {
  [Quadrant.UrgentImportant]: { label: 'Urgente e Importante', color: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
  [Quadrant.UrgentNotImportant]: { label: 'Urgente, No Importante', color: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300' },
  [Quadrant.NotUrgentImportant]: { label: 'No Urgente, Importante', color: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
  [Quadrant.NotUrgentNotImportant]: { label: 'No Urgente, No Importante', color: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' },
};