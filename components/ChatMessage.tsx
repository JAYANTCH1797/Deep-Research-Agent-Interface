import React from 'react';
import { ResearchProgressCard } from './ResearchProgressCard';
import { ResearchStep } from './ResearchInterface';

// ─── Typing Indicator (full-width, no bubble) ────────────────────────────────
export function TypingIndicator() {
    return (
        <div style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--ri-subtext)',
                letterSpacing: '-0.1px',
            }}>
                Agent is thinking
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="animate-pulse"
                        style={{
                            width: 4, height: 4, borderRadius: '50%',
                            background: 'var(--ri-subtext)',
                            animationDelay: `${i * 0.15}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Data type ────────────────────────────────────────────────────────────────
export interface ChatMessageData {
    id: string;
    role: 'agent' | 'user';
    text?: string;
    timestamp: Date;
    steps?: ResearchStep[];
}

interface ChatMessageProps {
    message: ChatMessageData;
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────
function Timestamp({ date }: { date: Date }) {
    return (
        <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 10,
            lineHeight: '15px',
            letterSpacing: '0.117px',
            color: 'var(--ri-subtext)',
            display: 'block',
        }}>
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    );
}

// ─── User bubble (right-aligned, no avatar) ───────────────────────────────────
function UserMessage({ message }: { message: ChatMessageData }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, maxWidth: '85%' }}>
                <div
                    style={{
                        background: 'var(--ri-bubble-user-bg)',
                        borderRadius: '10px 0px 10px 10px',
                        padding: '11px 14px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: '23px',
                        letterSpacing: '-0.15px',
                        color: 'var(--ri-bubble-user-text)',
                        wordBreak: 'break-word',
                    }}
                >
                    {message.text}
                </div>
                <Timestamp date={message.timestamp} />
            </div>
        </div>
    );
}

// ─── Agent message (full-width, no bubble, no avatar) ────────────────────────
function AgentMessage({ message }: { message: ChatMessageData }) {
    const hasContent = message.text || (message.steps && message.steps.length > 0);
    if (!hasContent) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {/* Inline label */}
            <span style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: '0.5px',
                textTransform: 'uppercase' as const,
                color: 'var(--ri-subtext)',
                display: 'block',
            }}>
                Agent
            </span>

            {/* Text (if any) — plain, full-width */}
            {message.text && (
                <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: '22px',
                    letterSpacing: '-0.15px',
                    color: 'var(--ri-canvas-text)',
                    margin: 0,
                    wordBreak: 'break-word',
                }}>
                    {message.text}
                </p>
            )}

            {/* Research progress card — full width */}
            {message.steps && message.steps.length > 0 && (
                <ResearchProgressCard steps={message.steps} />
            )}

            <Timestamp date={message.timestamp} />
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ChatMessage({ message }: ChatMessageProps) {
    if (message.role === 'user') {
        return <UserMessage message={message} />;
    }
    return <AgentMessage message={message} />;
}
