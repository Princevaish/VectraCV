// frontend/scripts/utils/markdown.js
// Lightweight Markdown → HTML renderer.
// Handles: h1-h3, bold, italic, inline code, fenced code,
// unordered lists, ordered lists, blockquotes, horizontal rules,
// paragraphs, and line breaks.

/**
 * Convert a Markdown string to an HTML string.
 * @param {string} md
 * @returns {string} HTML
 */
export function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '<p>No response.</p>';

  let html = md;

  // Fenced code blocks
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre><code class="lang-${lang || 'text'}">${escHtml(code.trim())}</code></pre>`
  );

  // Horizontal rule
  html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr />');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');

  // Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold + italic combos first
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.+?)___/g,        '<strong><em>$1</em></strong>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g,      '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+?)_/g,   '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>');

  // Unordered lists — collect consecutive li lines, wrap in <ul>
  html = html.replace(
    /(^[-*+] .+$(\n[-*+] .+$)*)/gm,
    block => {
      const items = block.replace(/^[-*+] (.+)$/gm, '<li>$1</li>');
      return `<ul>${items}</ul>`;
    }
  );

  // Ordered lists
  html = html.replace(
    /(^\d+\. .+$(\n\d+\. .+$)*)/gm,
    block => {
      const items = block.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
      return `<ol>${items}</ol>`;
    }
  );

  // Paragraphs: split by blank lines, wrap non-block elements
  html = html
    .split(/\n{2,}/)
    .map(chunk => {
      chunk = chunk.trim();
      if (!chunk) return '';
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr)/.test(chunk)) return chunk;
      // Replace single newlines inside paragraphs with <br>
      return `<p>${chunk.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

/** HTML-escape a raw string (used inside code blocks). */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}