
export enum ItemType {
  Shopping = 'shopping',
  Todo = 'todo',
}

export enum Quadrant {
  UrgentImportant = 'UrgentImportant',
  UrgentNotImportant = 'UrgentNotImportant',
  NotUrgentImportant = 'NotUrgentImportant',
  NotUrgentNotImportant = 'NotUrgentNotImportant',
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  note?: string;
  quantity?: string;
  done: boolean;
  quadrant?: Quadrant;
  createdAt: number;
}
