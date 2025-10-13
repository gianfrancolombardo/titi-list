import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { Item } from '../types';

// Helper to convert Firestore timestamp to a number
const convertTimestamp = (timestamp: Timestamp | null | undefined): number => {
    return timestamp ? timestamp.toDate().getTime() : Date.now();
};

export function useFirestoreItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [itemsTimeRemaining, setItemsTimeRemaining] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!db) {
      setError("No se pudo conectar a la base de datos. Revisa la configuración de Firebase.");
      setLoading(false);
      return;
    }

    const itemsCollectionRef = collection(db, 'items');
    const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const itemsData = querySnapshot.docs.map(doc => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            ...data,
            createdAt: convertTimestamp(data.createdAt),
            completedAt: convertTimestamp(data.completedAt),
          } as Item;
        });
        setItems(itemsData);
        setLoading(false);
      }, 
      (err) => {
        console.error("Error escuchando los cambios en Firestore:", err);
        setError("Error al obtener los datos. Inténtalo de nuevo.");
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Effect to hide completed items after 15 seconds with visual feedback
  useEffect(() => {
    const now = Date.now();
    const timeoutIds: NodeJS.Timeout[] = [];
    const intervalIds: NodeJS.Timeout[] = [];

    items.forEach(item => {
      if (item.done && item.completedAt && !hiddenItems.has(item.id)) {
        const timeSinceCompletion = now - item.completedAt;
        const remainingTime = 15000 - timeSinceCompletion; // 15 seconds

        if (remainingTime > 0) {
          // Set initial time remaining
          setItemsTimeRemaining(prev => new Map(prev).set(item.id, remainingTime));

          // Update time remaining every 100ms for smooth animation
          const intervalId = setInterval(() => {
            const currentTime = Date.now();
            const newTimeSinceCompletion = currentTime - item.completedAt!;
            const newRemainingTime = 15000 - newTimeSinceCompletion;

            if (newRemainingTime <= 0) {
              setItemsTimeRemaining(prev => {
                const newMap = new Map(prev);
                newMap.delete(item.id);
                return newMap;
              });
              clearInterval(intervalId);
            } else {
              setItemsTimeRemaining(prev => new Map(prev).set(item.id, newRemainingTime));
            }
          }, 100);
          intervalIds.push(intervalId);

          // Hide item after 15 seconds
          const timeoutId = setTimeout(() => {
            setHiddenItems(prev => new Set([...prev, item.id]));
            setItemsTimeRemaining(prev => {
              const newMap = new Map(prev);
              newMap.delete(item.id);
              return newMap;
            });
          }, remainingTime);
          timeoutIds.push(timeoutId);
        } else {
          // Item was completed more than 15 seconds ago, hide immediately
          setHiddenItems(prev => new Set([...prev, item.id]));
        }
      }
    });

    return () => {
      timeoutIds.forEach(clearTimeout);
      intervalIds.forEach(clearInterval);
    };
  }, [items, hiddenItems]);

  const addItem = async (itemData: Omit<Item, 'id' | 'done' | 'createdAt'>) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'items'), {
        ...itemData,
        done: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error añadiendo el documento:", err);
      setError("No se pudo añadir el ítem.");
    }
  };

  const updateItem = async (id: string, updates: Partial<Omit<Item, 'id'>>) => {
    if (!db) return;
    const itemDocRef = doc(db, 'items', id);
    
    // If marking as done, add completedAt timestamp
    const updateData = { ...updates };
    if (updates.done === true && !updates.completedAt) {
      updateData.completedAt = serverTimestamp();
    }
    
    try {
        await updateDoc(itemDocRef, updateData);
    } catch (err) {
        console.error("Error actualizando el documento:", err);
        setError("No se pudo actualizar el ítem.");
    }
  };

  const deleteItem = async (id: string) => {
    if (!db) return;
    const itemDocRef = doc(db, 'items', id);
    try {
        await deleteDoc(itemDocRef);
    } catch (err) {
        console.error("Error eliminando el documento:", err);
        setError("No se pudo eliminar el ítem.");
    }
  };

  // Filter out hidden items
  const visibleItems = items.filter(item => !hiddenItems.has(item.id));

  return { 
    items: visibleItems, 
    allItems: items, // Keep all items for reference
    loading, 
    error, 
    addItem, 
    updateItem, 
    deleteItem,
    hiddenItemsCount: hiddenItems.size,
    itemsTimeRemaining
  };
}
