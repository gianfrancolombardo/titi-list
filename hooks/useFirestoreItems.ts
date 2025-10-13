import { useState, useEffect } from 'react';
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
    try {
        await updateDoc(itemDocRef, updates);
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

  return { items, loading, error, addItem, updateItem, deleteItem };
}
