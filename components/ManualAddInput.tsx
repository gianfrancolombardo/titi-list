import React, { useState } from 'react';

interface ManualAddInputProps {
    onAdd: (text: string) => void;
    onClose: () => void;
}

export const ManualAddInput: React.FC<ManualAddInputProps> = ({ onAdd, onClose }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end justify-center p-4">
            <div 
                className="bg-white rounded-t-lg shadow-xl w-full max-w-lg p-4 transition-transform transform translate-y-0"
            >
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Ej: Comprar leche o agendar reunión para mañana"
                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-300"
                        disabled={!text.trim()}
                    >
                        Añadir
                    </button>
                </form>
            </div>
        </div>
    );
};