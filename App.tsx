import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFirestoreItems } from './hooks/useFirestoreItems';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useToast } from './hooks/useToast';
import { Item, ItemType } from './types';
import { Header } from './components/Header';
import { RecordButton } from './components/RecordButton';
import { ShoppingList } from './components/ShoppingList';
import { TodoList } from './components/TodoList';
import { ManualAddInput } from './components/ManualAddInput';
import { ToastContainer } from './components/ToastContainer';
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
  const [showManualAdd, setShowManualAdd] = useState(false);
  const { toasts, showToast, hideToast } = useToast();
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    isModelLoading: isLoadingSpeechModel,
    usingLocalModel,
    isSupported: speechSupported,
    statusMessage,
    statusLevel,
  } = useSpeechRecognition();

  useEffect(() => {
    if (getAiProvider() === 'none') {
        showToast("Configura VITE_API_KEY o VITE_OPENAI_API_KEY.", 'error');
    }
    if (firestoreError) {
        showToast(firestoreError, 'error');
    }
  }, [firestoreError, showToast]);

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
    console.info('[Speech] Transcript ready for AI:', text);
    
    try {
      const processedItems = await processTranscript(text);
      console.info('[AI] Processed items response:', processedItems);
      
      if (processedItems && processedItems.length > 0) {
        await handleNewItems(processedItems);
      } else {
        showToast("No te entendí bien. ¿Podrías intentarlo de nuevo?", 'error');
      }
    } catch (e) {
      console.error('Error processing transcript:', e);
      if (e instanceof Error && e.message.includes("No AI API key found")) {
        showToast("Por favor, configura una clave de API para Gemini u OpenAI.", 'error');
      } else {
        showToast("Lo siento, algo salió mal. Por favor, inténtalo de nuevo.", 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [handleNewItems, showToast]);

  useEffect(() => {
    if (transcript && !isListening && !isProcessing) {
      processAndAddItems(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);

  useEffect(() => {
    if (!speechSupported) {
      showToast('El reconocimiento de voz no es compatible en este dispositivo.', 'error');
    } else if (speechError) {
      showToast(`Error de voz: ${speechError}`, 'error');
    }
  }, [speechError, showToast, speechSupported]);

  const lastStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (statusMessage && statusMessage !== lastStatusRef.current) {
      showToast(statusMessage, statusLevel ?? 'info', 2500);
      lastStatusRef.current = statusMessage;
    } else if (!statusMessage) {
      lastStatusRef.current = null;
    }
  }, [showToast, statusLevel, statusMessage]);

  const isProcessingRef = useRef(false);
  useEffect(() => {
    if (isProcessing && !isProcessingRef.current) {
      showToast('Procesando la lista con IA…', 'info', 2200);
    }
    isProcessingRef.current = isProcessing;
  }, [isProcessing, showToast]);
  
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
            {(isProcessing || statusMessage) && (
              <p className="text-sm text-gray-500 absolute -top-6 animate-pulse">
                {isProcessing ? 'Procesando...' : statusMessage}
              </p>
            )}
            <RecordButton
              isListening={isListening}
              onStart={startListening}
              onStop={stopListening}
              disabled={!speechSupported || isProcessing || (isLoadingSpeechModel && !isListening)}
              mode={usingLocalModel ? 'local' : 'web'}
            />
        </div>
      </div>
      
       <div className="fixed bottom-6 right-6">
            <button
                onClick={() => setShowManualAdd(!showManualAdd)}
                className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg transition-slow hover-scale-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                  showManualAdd 
                    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' 
                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400'
                }`}
                aria-label={showManualAdd ? 'Cerrar añadido manual' : 'Abrir añadido manual'}
            >
                <div className={`transition-slow ${showManualAdd ? 'rotate-180' : ''}`}>
                  {showManualAdd ? <XIcon /> : <PlusIcon />}
                </div>
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

        <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
};

export default App;