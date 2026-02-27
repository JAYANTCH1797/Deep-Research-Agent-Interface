/**
 * markdownToHtml.ts
 * Converts a markdown string to HTML suitable for loading into TipTap.
 * This is a lightweight converter — no external deps required.
 */

export function markdownToHtml(markdown: string): string {
    if (!markdown) return '';

    let html = markdown;

    // Fenced code blocks (``` ... ```) — must come before inline code
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
        const escaped = escapeHtml(code.trimEnd());
        return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    });

    // Headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

    // Unordered lists — group consecutive li items
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Note: consecutive ol items after ul conversion — wrap unwrapped li runs
    html = html.replace(/(?<!<\/ul>)(<li>[\s\S]*?<\/li>)+(?!<\/ul>)/g, (match) => {
        if (!match.includes('<ul>')) return `<ol>${match}</ol>`;
        return match;
    });

    // Bold + Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Underline (non-standard: ++text++)
    html = html.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Paragraphs — wrap lines that aren't block elements
    const lines = html.split('\n');
    const result: string[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (
            line === '' ||
            line.startsWith('<h') ||
            line.startsWith('<ul') ||
            line.startsWith('<ol') ||
            line.startsWith('<li') ||
            line.startsWith('<blockquote') ||
            line.startsWith('<pre') ||
            line.startsWith('<hr')
        ) {
            result.push(line);
        } else {
            result.push(`<p>${line}</p>`);
        }
        i++;
    }

    return result.filter(l => l !== '').join('\n');
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
