import React, { useState, useEffect, useRef } from 'react';

interface SelectionToolbarProps {
    x: number;
    y: number;
    onClose: () => void;
    onSubmit: (instruction: string) => void;
}

export function SelectionToolbar({ x, y, onClose, onSubmit }: SelectionToolbarProps) {
    const [instruction, setInstruction] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus input when toolbar appears
        if (inputRef.current) {
            inputRef.current.focus();
        }

        // Close on escape
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (instruction.trim()) {
            onSubmit(instruction);
            setInstruction('');
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: x,
                top: y,
                transform: 'translate(-50%, -100%) translateY(-8px)', // Center horizontally, place above selection with 8px gap
                zIndex: 1000,
                background: 'var(--ri-chat-bg)',
                border: '1px solid var(--ri-chat-border)',
                borderRadius: 12,
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 300,
                animation: 'fadeIn 0.1s ease-out forwards',
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%', gap: 8 }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ask AI to edit selection..."
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 14,
                        color: 'var(--ri-input-text)',
                        padding: '4px 0',
                    }}
                />
                <button
                    type="submit"
                    disabled={!instruction.trim()}
                    style={{
                        background: instruction.trim() ? '#2B7FFF' : 'var(--ri-step-connector)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: instruction.trim() ? 'pointer' : 'default',
                        transition: 'background 0.2s',
                    }}
                >
                    Edit
                </button>
            </form>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -100%) translateY(0px) scale(0.95); }
                    to { opacity: 1; transform: translate(-50%, -100%) translateY(-8px) scale(1); }
                }
            `}</style>
        </div>
    );
}
