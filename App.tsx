import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestoreItems } from './hooks/useFirestoreItems';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { Item, ItemType } from './types';
import { Header } from './components/Header';
import { RecordButton } from './components/RecordButton';
import { ShoppingList } from './components/ShoppingList';
import { TodoList } from './components/TodoList';
import { ManualAddInput } from './components/ManualAddInput';
import { PlusIcon, XIcon } from './components/icons';
import { processTranscript, getAiProvider } from './services/aiService';

const App: React.FC = () => {
  const { 
    items, 
    allItems,
    addItem, 
    updateItem, 
    deleteItem, 
    loading: itemsLoading, 
    error: firestoreError,
    itemsTimeRemaining
  } = useFirestoreItems();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition();

  useEffect(() => {
    if (getAiProvider() === 'none') {
        setError("Configura VITE_API_KEY o VITE_OPENAI_API_KEY.");
    }
    if (firestoreError) {
        setError(firestoreError);
    }
  }, [firestoreError]);

  const handleNewItems = useCallback(async (newItemsData: Omit<Item, 'id' | 'done' | 'createdAt'>[]) => {
    // Basic deduplication against existing items
    const uniqueNewItems = newItemsData.filter(newItem => 
      !items.some(existingItem => existingItem.title.toLowerCase() === newItem.title.toLowerCase())
    );

    if (uniqueNewItems.length > 0) {
      await Promise.all(uniqueNewItems.map(item => addItem(item)));
    }
  }, [items, addItem]);

  const processAndAddItems = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const processedItems = await processTranscript(text);
      if (processedItems && processedItems.length > 0) {
        await handleNewItems(processedItems);
      } else {
        setError("No te entendí bien. ¿Podrías intentarlo de nuevo?");
      }
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message.includes("No AI API key found")) {
        setError("Por favor, configura una clave de API para Gemini u OpenAI.");
      } else {
        setError("Lo siento, algo salió mal. Por favor, inténtalo de nuevo.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [handleNewItems]);

  useEffect(() => {
    if (transcript && !isListening && !isProcessing) {
      processAndAddItems(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);

  useEffect(() => {
    if (speechError) {
      setError(`Error de voz: ${speechError}`);
    }
  }, [speechError]);
  
  const toggleItemDone = async (id: string, currentDone: boolean) => {
    await updateItem(id, { done: !currentDone });
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
  };

  const shoppingItems = useMemo(() => items.filter(item => item.type === ItemType.Shopping), [items]);
  const todoItems = useMemo(() => items.filter(item => item.type === ItemType.Todo), [items]);
  
  // Use allItems for header counters to show total count including hidden items
  const allShoppingItems = useMemo(() => allItems.filter(item => item.type === ItemType.Shopping), [allItems]);
  const allTodoItems = useMemo(() => allItems.filter(item => item.type === ItemType.Todo), [allItems]);

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col font-sans p-4 pb-32 bg-gray-50">
      <Header />

      <main className="flex-grow flex flex-col gap-6 mt-6">
        {itemsLoading && (
            <div className="text-center text-gray-400 mt-20">
                <p>Cargando lista...</p>
            </div>
        )}
        {!itemsLoading && items.length === 0 && !isProcessing && !isListening && (
            <div className="text-center text-gray-400 mt-20">
                <p>¡Lista cuando quieras!</p>
                <p>Toca el micrófono para añadir algo.</p>
            </div>
        )}
        <ShoppingList 
          items={shoppingItems} 
          allItems={allShoppingItems}
          onToggleDone={toggleItemDone} 
          onDelete={handleDeleteItem} 
          itemsTimeRemaining={itemsTimeRemaining}
        />
        <TodoList 
          items={todoItems} 
          allItems={allTodoItems}
          onToggleDone={toggleItemDone} 
          onDelete={handleDeleteItem} 
          itemsTimeRemaining={itemsTimeRemaining}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center items-center p-6 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
        <div className="relative flex flex-col items-center">
            {isProcessing && <p className="text-sm text-gray-500 absolute -top-6 animate-pulse">Procesando...</p>}
            {error && !isProcessing && <p className="text-sm text-red-500 absolute -top-6">{error}</p>}
            <RecordButton isListening={isListening} onStart={startListening} onStop={stopListening} />
        </div>
      </div>
      
       <div className="fixed bottom-6 right-6">
            <button
                onClick={() => setShowManualAdd(!showManualAdd)}
                className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
                aria-label={showManualAdd ? 'Cerrar añadido manual' : 'Abrir añadido manual'}
            >
                {showManualAdd ? <XIcon /> : <PlusIcon />}
            </button>
        </div>

        {showManualAdd && (
            <ManualAddInput
                onAdd={(text) => {
                    processAndAddItems(text);
                    setShowManualAdd(false);
                }}
                onClose={() => setShowManualAdd(false)}
            />
        )}
    </div>
  );
};

export default App;