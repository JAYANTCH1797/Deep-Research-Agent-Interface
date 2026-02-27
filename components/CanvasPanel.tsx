import React, { useRef } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { SelectionToolbar } from './SelectionToolbar';
import { useState } from 'react';

// Skeleton block for loading state
function SkeletonBlock({ width = '100%', height = 16, opacity = 1 }: { width?: string | number; height?: number; opacity?: number }) {
    return (
        <div
            style={{
                width,
                height,
                background: 'var(--ri-step-connector)',
                borderRadius: 4,
                flexShrink: 0,
                opacity,
            }}
            className="animate-pulse"
        />
    );
}

function CanvasSkeleton() {
    return (
        <div style={{ width: '100%', maxWidth: 748, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Report header card skeleton */}
            <div
                style={{
                    background: 'rgba(0, 201, 80, 0.03)',
                    border: '1px solid rgba(0, 201, 80, 0.1)',
                    borderRadius: 10,
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 48,
                }}
            >
                <div
                    style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(0, 201, 80, 0.08)',
                        flexShrink: 0,
                    }}
                    className="animate-pulse"
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SkeletonBlock width={140} height={20} />
                    <SkeletonBlock width={260} height={14} opacity={0.6} />
                </div>
            </div>

            {/* Executive summary block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
                <SkeletonBlock width={180} height={24} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SkeletonBlock width="100%" height={14} />
                    <SkeletonBlock width="96%" height={14} />
                    <SkeletonBlock width="92%" height={14} />
                    <SkeletonBlock width="98%" height={14} />
                    <SkeletonBlock width="80%" height={14} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SkeletonBlock width="100%" height={14} />
                    <SkeletonBlock width="88%" height={14} />
                    <SkeletonBlock width="95%" height={14} />
                </div>
            </div>

            {/* Section 1 block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
                <SkeletonBlock width={280} height={24} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SkeletonBlock width="100%" height={14} />
                    <SkeletonBlock width="94%" height={14} />
                    <SkeletonBlock width="89%" height={14} />
                    <SkeletonBlock width="97%" height={14} />
                    <SkeletonBlock width="72%" height={14} />
                </div>
                <div style={{ borderLeft: '2px solid var(--ri-step-connector)', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SkeletonBlock width="100%" height={14} />
                    <SkeletonBlock width="90%" height={14} />
                    <SkeletonBlock width="85%" height={14} />
                </div>
            </div>

            {/* Section 2 block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SkeletonBlock width={320} height={24} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SkeletonBlock width="100%" height={14} />
                    <SkeletonBlock width="91%" height={14} />
                    <SkeletonBlock width="84%" height={14} />
                </div>
            </div>
        </div>
    );
}

interface CanvasPanelProps {
    result: string;
    isComplete: boolean;
    isRunning: boolean;
    query: string;
    error?: string | null;
    onResultChange?: (newResult: string) => void;
    onEditRequest?: (selectedText: string, instruction: string) => void;
}

export function CanvasPanel({ result, isComplete, isRunning, query, error, onResultChange, onEditRequest }: CanvasPanelProps) {
    const [selection, setSelection] = useState<{ x: number, y: number, text: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const showSkeleton = isRunning && !result;
    const showEmpty = !isRunning && !isComplete && !result;

    // Handle text selection for AI edit toolbar
    const handleMouseUp = () => {
        if (!onEditRequest) return;

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
            setSelection(null);
            return;
        }

        const text = sel.toString().trim();
        if (!text) return;

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelection({
            x: rect.left + rect.width / 2,
            y: rect.top,
            text,
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                height: '100%',
                background: 'var(--ri-canvas-bg)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '48px 48px',
                position: 'relative',
            }}
            onMouseUp={handleMouseUp}
        >
            {/* AI Selection Toolbar */}
            {selection && onEditRequest && (
                <SelectionToolbar
                    x={selection.x}
                    y={selection.y}
                    onClose={() => setSelection(null)}
                    onSubmit={(instruction) => {
                        onEditRequest(selection.text, instruction);
                        setSelection(null);
                        window.getSelection()?.removeAllRanges();
                    }}
                />
            )}

            {/* Empty/idle state */}
            {showEmpty && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: 16,
                        opacity: 0.4,
                    }}
                >
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="8" y="6" width="32" height="40" rx="3" stroke="var(--ri-canvas-sub)" strokeWidth="2" />
                        <line x1="16" y1="16" x2="32" y2="16" stroke="var(--ri-canvas-sub)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="16" y1="22" x2="32" y2="22" stroke="var(--ri-canvas-sub)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="16" y1="28" x2="26" y2="28" stroke="var(--ri-canvas-sub)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: 'var(--ri-canvas-sub)' }}>
                        Research results will appear here
                    </span>
                </div>
            )}

            {/* Skeleton loading */}
            {showSkeleton && <CanvasSkeleton />}

            {/* Error state */}
            {error && (
                <div
                    style={{
                        width: '100%',
                        maxWidth: 748,
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 10,
                        padding: 24,
                    }}
                >
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#EF4444', margin: 0 }}>
                        {error}
                    </p>
                </div>
            )}

            {/* Research result — WYSIWYG rich editor (always shown, always editable) */}
            {result && (
                <div style={{ width: '100%', maxWidth: 748, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Research Complete header card */}
                    <div
                        style={{
                            background: 'rgba(0, 201, 80, 0.05)',
                            border: '1px solid rgba(0, 201, 80, 0.2)',
                            borderRadius: 10,
                            padding: '24px 0 0 24px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 16,
                        }}
                    >
                        {/* Green file icon */}
                        <div
                            style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'rgba(0, 201, 80, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 2H14L20 8V22H4V2Z" stroke="#00C950" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M14 2V8H20" stroke="#00C950" strokeWidth="2" />
                                <line x1="8" y1="13" x2="16" y2="13" stroke="#00C950" strokeWidth="2" strokeLinecap="round" />
                                <line x1="8" y1="17" x2="16" y2="17" stroke="#00C950" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 24 }}>
                            <span
                                style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 600,
                                    fontSize: 18,
                                    lineHeight: '28px',
                                    letterSpacing: '-0.439px',
                                    color: '#00C950',
                                }}
                            >
                                Research Complete
                            </span>
                            {query && (
                                <span
                                    style={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: 400,
                                        fontSize: 14,
                                        lineHeight: '20px',
                                        letterSpacing: '-0.15px',
                                        color: 'var(--ri-canvas-sub)',
                                    }}
                                >
                                    Query: "{query}"
                                </span>
                            )}
                        </div>
                    </div>

                    {/* WYSIWYG Rich Text Editor — always shows formatted content */}
                    <RichTextEditor
                        value={result}
                        onChange={onResultChange}
                        onSelectionEdit={onEditRequest}
                        readOnly={!onResultChange}
                    />
                </div>
            )}
        </div>
    );
}
