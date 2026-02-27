import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Typography from '@tiptap/extension-typography';
import { EditorToolbar } from './EditorToolbar';
import { markdownToHtml } from '../utils/markdownToHtml';
import { prosemirrorToMarkdown } from '../utils/htmlToMarkdown';

interface RichTextEditorProps {
    value: string;
    onChange?: (markdown: string) => void;
    onSelectionEdit?: (selectedText: string, instruction: string) => void;
    readOnly?: boolean;
}

export function RichTextEditor({ value, onChange, onSelectionEdit, readOnly = false }: RichTextEditorProps) {
    // Track whether the current content was set externally (to avoid re-setting on local edits)
    const lastExternalValue = useRef<string>('');
    const isInternalChange = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
                code: {},
                codeBlock: { languageClassPrefix: 'language-' },
                blockquote: {},
                bulletList: {},
                orderedList: {},
                horizontalRule: {},
                history: {},
            }),
            Underline,
            Typography,
        ],
        content: markdownToHtml(value),
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'ri-tiptap-editor',
                spellcheck: 'true',
            },
        },
        onUpdate: ({ editor }) => {
            if (!onChange) return;
            isInternalChange.current = true;
            const json = editor.getJSON();
            const markdown = prosemirrorToMarkdown(json as any);
            onChange(markdown);
        },
    });

    // Sync external value changes into the editor (e.g. AI edit result coming from backend)
    useEffect(() => {
        if (!editor) return;
        if (isInternalChange.current) {
            // This update was triggered by our own onUpdate — skip to avoid a loop
            isInternalChange.current = false;
            return;
        }
        if (value === lastExternalValue.current) return;
        lastExternalValue.current = value;

        // Replace the content without losing cursor position if possible
        const html = markdownToHtml(value);
        editor.commands.setContent(html, false);
    }, [value, editor]);

    // Handle text selection for AI edit (mirrors SelectionToolbar logic in CanvasPanel)
    const handleMouseUp = () => {
        if (!onSelectionEdit) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const text = sel.toString().trim();
        if (!text) return;
        // Return the selected text so the parent can show the SelectionToolbar
    };

    return (
        <div style={{ width: '100%' }} onMouseUp={handleMouseUp}>
            {/* Formatting Toolbar */}
            {!readOnly && onChange && (
                <div style={{ marginBottom: 16 }}>
                    <EditorToolbar editor={editor} />
                </div>
            )}

            {/* Editor Content */}
            <EditorContent editor={editor} />

            {/* Scoped styles for the TipTap editor */}
            <style>{`
                .ri-tiptap-editor {
                    outline: none;
                    font-family: Inter, sans-serif;
                    color: var(--ri-canvas-text);
                    min-height: 200px;
                }

                /* Paragraphs */
                .ri-tiptap-editor p {
                    font-weight: 400;
                    font-size: 16px;
                    line-height: 26px;
                    letter-spacing: -0.3125px;
                    color: var(--ri-canvas-text);
                    margin-bottom: 16px;
                    margin-top: 0;
                }

                /* Headings */
                .ri-tiptap-editor h1 {
                    font-weight: 700;
                    font-size: 24px;
                    line-height: 32px;
                    letter-spacing: -0.449px;
                    color: var(--ri-canvas-text);
                    margin-top: 0;
                    margin-bottom: 24px;
                }
                .ri-tiptap-editor h2 {
                    font-weight: 700;
                    font-size: 20px;
                    line-height: 28px;
                    letter-spacing: -0.449px;
                    color: var(--ri-canvas-text);
                    margin-top: 48px;
                    margin-bottom: 16px;
                }
                .ri-tiptap-editor h3 {
                    font-weight: 500;
                    font-size: 18px;
                    line-height: 27px;
                    letter-spacing: -0.439px;
                    color: var(--ri-canvas-text);
                    margin-top: 24px;
                    margin-bottom: 16px;
                }
                .ri-tiptap-editor h4, .ri-tiptap-editor h5, .ri-tiptap-editor h6 {
                    font-weight: 600;
                    font-size: 16px;
                    color: var(--ri-canvas-text);
                    margin-top: 16px;
                    margin-bottom: 8px;
                }

                /* Bold / Italic / Underline */
                .ri-tiptap-editor strong { font-weight: 700; color: var(--ri-canvas-text); }
                .ri-tiptap-editor em { font-style: italic; color: var(--ri-canvas-text); }
                .ri-tiptap-editor u { text-decoration: underline; }

                /* Lists */
                .ri-tiptap-editor ul,
                .ri-tiptap-editor ol {
                    padding-left: 0;
                    margin: 0 0 16px 0;
                    list-style: none;
                }
                .ri-tiptap-editor li {
                    border-left: 2px solid var(--ri-step-connector);
                    padding-left: 18px;
                    padding-top: 4px;
                    padding-bottom: 4px;
                    margin-bottom: 16px;
                    font-weight: 500;
                    font-size: 16px;
                    line-height: 26px;
                    letter-spacing: -0.3125px;
                    color: var(--ri-canvas-text);
                }
                .ri-tiptap-editor li p { margin: 0; }

                /* Blockquote */
                .ri-tiptap-editor blockquote {
                    border-left: 2px solid #2B7FFF;
                    padding-left: 18px;
                    margin: 0 0 16px 0;
                    color: var(--ri-canvas-sub);
                }

                /* Inline code */
                .ri-tiptap-editor code {
                    background: var(--ri-canvas-code-bg, rgba(120,120,120,0.12));
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-family: monospace;
                    color: var(--ri-canvas-text);
                }

                /* Code block */
                .ri-tiptap-editor pre {
                    background: var(--ri-canvas-code-bg, rgba(120,120,120,0.12));
                    padding: 16px;
                    border-radius: 8px;
                    overflow: auto;
                    margin-bottom: 16px;
                }
                .ri-tiptap-editor pre code {
                    background: transparent;
                    padding: 0;
                    font-size: 13px;
                    font-family: monospace;
                }

                /* Links */
                .ri-tiptap-editor a {
                    color: #2B7FFF;
                    text-decoration: underline;
                }

                /* Horizontal rule */
                .ri-tiptap-editor hr {
                    border: none;
                    border-top: 1px solid var(--ri-divider);
                    margin: 32px 0;
                }

                /* Placeholder */
                .ri-tiptap-editor p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    color: var(--ri-canvas-sub);
                    pointer-events: none;
                    float: left;
                    height: 0;
                    opacity: 0.5;
                }

                /* Cursor / selection */
                .ri-tiptap-editor ::selection {
                    background: rgba(43, 127, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
