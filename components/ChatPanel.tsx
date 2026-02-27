import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage, ChatMessageData, TypingIndicator } from './ChatMessage';

interface ChatPanelProps {
    messages: ChatMessageData[];
    isTyping: boolean;       // show typing dots while agent is "thinking"
    isRunning: boolean;      // disable send while research is active
    onSendMessage: (text: string) => void;
}

export function ChatPanel({ messages, isTyping, isRunning, onSendMessage }: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text || isRunning) return;
        onSendMessage(text);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    const canSend = inputValue.trim().length > 0 && !isRunning;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'var(--ri-chat-bg)',
                borderRight: '1px solid var(--ri-chat-border)',
                overflow: 'hidden',
            }}
        >
            {/* Chat section header */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 16px',
                    height: 53,
                    background: 'var(--ri-chat-header-bg)',
                    borderBottom: '1px solid var(--ri-chat-border)',
                    flexShrink: 0,
                }}
            >
                {/* Title */}
                <div className="flex items-center gap-2">
                    {/* AI Icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M5.333 2.667L5.333 4.667" stroke="#2B7FFF" strokeWidth="1.333" strokeLinecap="round" />
                        <path d="M2.667 5.333H13.333V13.333H2.667V5.333Z" stroke="#2B7FFF" strokeWidth="1.333" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M1.333 9.333H2.667" stroke="#2B7FFF" strokeWidth="1.333" strokeLinecap="round" />
                        <path d="M13.333 9.333H14.667" stroke="#2B7FFF" strokeWidth="1.333" strokeLinecap="round" />
                        <path d="M10 8.667V10" stroke="#2B7FFF" strokeWidth="1.333" strokeLinecap="round" />
                        <path d="M6 8.667V10" stroke="#2B7FFF" strokeWidth="1.333" strokeLinecap="round" />
                    </svg>
                    <span
                        style={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: '20px',
                            letterSpacing: '-0.15px',
                            color: 'var(--ri-header-text)',
                        }}
                    >
                        Research Assistant
                    </span>
                </div>

                {/* Online status */}
                <div className="flex items-center gap-1.5">
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#00C950',
                            opacity: 0.52,
                        }}
                    />
                    <span
                        style={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 400,
                            fontSize: 12,
                            lineHeight: '16px',
                            color: 'var(--ri-step-subtext)',
                        }}
                    >
                        Online
                    </span>
                </div>
            </div>

            {/* Messages area */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                }}
            >
                {/* Empty state — before first query */}
                {messages.length === 0 && (
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: 0.35,
                            paddingBottom: 32,
                            minHeight: 200,
                        }}
                    >
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M4 6C4 4.89543 4.89543 4 6 4H26C27.1046 4 28 4.89543 28 6V20C28 21.1046 27.1046 22 26 22H18L12 28V22H6C4.89543 22 4 21.1046 4 20V6Z"
                                stroke="var(--ri-subtext)" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                        <span style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 12,
                            color: 'var(--ri-subtext)',
                        }}>
                            Your query will appear here
                        </span>
                    </div>
                )}

                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}

                {isTyping && <TypingIndicator />}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} style={{ height: 16 }} />
            </div>

            {/* Footer input */}
            <div
                style={{
                    padding: '17px 16px',
                    background: 'var(--ri-chat-header-bg)',
                    borderTop: '1px solid var(--ri-chat-border)',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {/* Input row */}
                <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask to research something..."
                        disabled={isRunning}
                        style={{
                            width: '100%',
                            height: 46,
                            background: 'var(--ri-input-bg)',
                            border: '1px solid var(--ri-input-border)',
                            borderRadius: 10,
                            padding: '12px 48px 12px 16px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '17px',
                            letterSpacing: '-0.15px',
                            color: 'var(--ri-input-text)',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!canSend}
                        style={{
                            position: 'absolute',
                            right: 10,
                            top: 10,
                            width: 26,
                            height: 26,
                            background: canSend ? '#155DFC' : 'rgba(21, 93, 252, 0.5)',
                            borderRadius: 8,
                            border: 'none',
                            cursor: canSend ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'background 0.15s',
                        }}
                    >
                        <Send size={12} color="#FFFFFF" />
                    </button>
                </form>

                {/* Disclaimer */}
                <p
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: 10,
                        lineHeight: '15px',
                        letterSpacing: '0.117px',
                        color: 'var(--ri-subtext)',
                        textAlign: 'center',
                        margin: 0,
                    }}
                >
                    Agent can make mistakes. Always verify important information.
                </p>
            </div>
        </div>
    );
}
