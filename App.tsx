import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    isTranscribing,
    status,
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

  useEffect(() => {
    console.info('[App] Whisper status', status);
  }, [status]);

  const processAndAddItems = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      console.warn('[App] Empty transcript received, skipping AI processing');
      showToast("No detecté palabras claras en el audio.", 'error');
      return;
    }
    console.info('[App] Sending transcript to AI pipeline', trimmed);
    
    setIsProcessing(true);
    
    try {
      const processedItems = await processTranscript(trimmed);
      
      if (processedItems && processedItems.length > 0) {
        console.info('[App] AI produced items', processedItems);
        await handleNewItems(processedItems);
        console.info('[App] Items added to Firestore', processedItems.length);
      } else {
        console.warn('[App] AI did not return items');
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

  const handleStartRecording = useCallback(() => {
    startListening();
  }, [startListening]);

  const handleStopRecording = useCallback(() => {
    stopListening();
  }, [stopListening]);

  useEffect(() => {
    if (transcript && !isListening && !isProcessing && !isTranscribing) {
      console.info('[App] Transcript ready for processing', transcript);
      void processAndAddItems(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening, isTranscribing]);

  useEffect(() => {
    if (speechError) {
      console.error('[App] Speech hook error', speechError);
      showToast(`Error de voz: ${speechError}`, 'error');
    }
  }, [speechError, showToast]);
  
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
            <RecordButton
              isListening={isListening}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
              disabled={isTranscribing || isProcessing}
              isBusy={isTranscribing || isProcessing}
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