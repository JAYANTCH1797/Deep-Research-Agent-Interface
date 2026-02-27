import React from 'react';
import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
    editor: Editor | null;
}

const DIVIDER = () => (
    <div style={{
        width: 1,
        height: 18,
        background: 'var(--ri-divider)',
        margin: '0 4px',
        flexShrink: 0,
    }} />
);

interface ToolButtonProps {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}

const ToolButton = ({ active, disabled, onClick, title, children }: ToolButtonProps) => (
    <button
        title={title}
        disabled={disabled}
        onMouseDown={(e) => {
            e.preventDefault(); // Prevent focus loss from editor
            if (!disabled) onClick();
        }}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 5,
            border: 'none',
            background: active ? 'var(--ri-step-connector)' : 'transparent',
            color: active ? 'var(--ri-canvas-text)' : 'var(--ri-canvas-sub)',
            cursor: disabled ? 'default' : 'pointer',
            fontSize: 12,
            fontWeight: active ? 700 : 500,
            fontFamily: 'Inter, sans-serif',
            opacity: disabled ? 0.4 : 1,
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0,
        }}
    >
        {children}
    </button>
);

export function EditorToolbar({ editor }: EditorToolbarProps) {
    if (!editor) return null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '6px 10px',
                background: 'var(--ri-step-card-bg)',
                border: '1px solid var(--ri-step-card-border)',
                borderRadius: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                flexWrap: 'wrap',
                userSelect: 'none',
            }}
        >
            {/* Headings */}
            <ToolButton
                title="Heading 1"
                active={editor.isActive('heading', { level: 1 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
                H1
            </ToolButton>
            <ToolButton
                title="Heading 2"
                active={editor.isActive('heading', { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                H2
            </ToolButton>
            <ToolButton
                title="Heading 3"
                active={editor.isActive('heading', { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                H3
            </ToolButton>

            <DIVIDER />

            {/* Text Style */}
            <ToolButton
                title="Bold (Ctrl+B)"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                </svg>
            </ToolButton>
            <ToolButton
                title="Italic (Ctrl+I)"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="4" x2="10" y2="4" />
                    <line x1="14" y1="20" x2="5" y2="20" />
                    <line x1="15" y1="4" x2="9" y2="20" />
                </svg>
            </ToolButton>
            <ToolButton
                title="Underline (Ctrl+U)"
                active={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
                    <line x1="4" y1="20" x2="20" y2="20" />
                </svg>
            </ToolButton>

            <DIVIDER />

            {/* Inline Code */}
            <ToolButton
                title="Inline Code"
                active={editor.isActive('code')}
                onClick={() => editor.chain().focus().toggleCode().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                </svg>
            </ToolButton>

            {/* Code Block */}
            <ToolButton
                title="Code Block"
                active={editor.isActive('codeBlock')}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                    <path d="M7 8l-2 2 2 2M17 8l2 2-2 2M13 7l-2 5" />
                </svg>
            </ToolButton>

            {/* Equation (insert inline LaTeX placeholder) */}
            <ToolButton
                title="Equation (LaTeX)"
                active={false}
                onClick={() => {
                    editor.chain().focus().insertContent('<code>$equation$</code>').run();
                }}
            >
                <span style={{ fontFamily: 'serif', fontSize: 14, lineHeight: 1 }}>∑</span>
            </ToolButton>

            <DIVIDER />

            {/* Blockquote */}
            <ToolButton
                title="Blockquote"
                active={editor.isActive('blockquote')}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                </svg>
            </ToolButton>

            {/* Bullet List */}
            <ToolButton
                title="Bullet List"
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="9" y1="6" x2="20" y2="6" />
                    <line x1="9" y1="12" x2="20" y2="12" />
                    <line x1="9" y1="18" x2="20" y2="18" />
                    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
                </svg>
            </ToolButton>

            {/* Ordered List */}
            <ToolButton
                title="Ordered List"
                active={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="10" y1="6" x2="21" y2="6" />
                    <line x1="10" y1="12" x2="21" y2="12" />
                    <line x1="10" y1="18" x2="21" y2="18" />
                    <path d="M4 6h1v4" />
                    <path d="M4 10h2" />
                    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                </svg>
            </ToolButton>

            <DIVIDER />

            {/* Horizontal Rule */}
            <ToolButton
                title="Horizontal Rule"
                active={false}
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
            </ToolButton>

            {/* Undo / Redo */}
            <DIVIDER />
            <ToolButton
                title="Undo (Ctrl+Z)"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M3 13A9 9 0 1 0 6 6.7L3 13" />
                </svg>
            </ToolButton>
            <ToolButton
                title="Redo (Ctrl+Y)"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M21 13A9 9 0 1 1 18 6.7L21 13" />
                </svg>
            </ToolButton>
        </div>
    );
}
