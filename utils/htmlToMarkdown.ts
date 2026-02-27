/**
 * htmlToMarkdown.ts
 * Converts TipTap's ProseMirror JSON document to a clean Markdown string.
 * Used to serialize editor content back to markdown for the AI edit API.
 */

type Mark = { type: string; attrs?: Record<string, any> };
type Node = {
    type: string;
    attrs?: Record<string, any>;
    content?: Node[];
    marks?: Mark[];
    text?: string;
};

export function prosemirrorToMarkdown(doc: Node): string {
    return nodeToMarkdown(doc).trim();
}

function nodeToMarkdown(node: Node, ctx?: { ordered?: boolean; index?: number }): string {
    switch (node.type) {
        case 'doc':
            return (node.content || []).map(n => nodeToMarkdown(n)).join('\n\n');

        case 'paragraph': {
            const inner = inlineContent(node);
            return inner || '';
        }

        case 'heading': {
            const level = node.attrs?.level ?? 1;
            const prefix = '#'.repeat(level);
            return `${prefix} ${inlineContent(node)}`;
        }

        case 'bulletList':
            return (node.content || [])
                .map(li => nodeToMarkdown(li, { ordered: false }))
                .join('\n');

        case 'orderedList':
            return (node.content || [])
                .map((li, i) => nodeToMarkdown(li, { ordered: true, index: i + 1 }))
                .join('\n');

        case 'listItem': {
            const bullet = ctx?.ordered ? `${ctx.index}.` : '-';
            const inner = (node.content || [])
                .map(n => nodeToMarkdown(n))
                .join('\n')
                .trim();
            return `${bullet} ${inner}`;
        }

        case 'blockquote': {
            const inner = (node.content || [])
                .map(n => nodeToMarkdown(n))
                .join('\n');
            return inner
                .split('\n')
                .map(l => `> ${l}`)
                .join('\n');
        }

        case 'codeBlock': {
            const lang = node.attrs?.language || '';
            const code = (node.content || []).map(n => n.text || '').join('');
            return `\`\`\`${lang}\n${code}\n\`\`\``;
        }

        case 'horizontalRule':
            return '---';

        case 'hardBreak':
            return '  \n';

        case 'text':
            return applyMarks(node.text || '', node.marks || []);

        default:
            // Fallback: recurse into content
            if (node.content) {
                return (node.content || []).map(n => nodeToMarkdown(n)).join('');
            }
            return node.text || '';
    }
}

function inlineContent(node: Node): string {
    return (node.content || []).map(n => nodeToMarkdown(n)).join('');
}

function applyMarks(text: string, marks: Mark[]): string {
    let result = text;
    for (const mark of marks) {
        switch (mark.type) {
            case 'bold':
                result = `**${result}**`;
                break;
            case 'italic':
                result = `*${result}*`;
                break;
            case 'underline':
                result = `++${result}++`;
                break;
            case 'code':
                result = `\`${result}\``;
                break;
            case 'link': {
                const href = mark.attrs?.href || '';
                result = `[${result}](${href})`;
                break;
            }
            default:
                break;
        }
    }
    return result;
}
