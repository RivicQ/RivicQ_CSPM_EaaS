import React from 'react';
import { Link } from 'react-router-dom';

type Block =
  | { kind: 'h'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'hr' }
  | { kind: 'table'; headers: string[]; rows: string[][] };

const ARCHIFY = '/RivicQ_CSPM_EaaS/archify/site/index.html';

const DOC_ROUTES: Record<string, string> = {
  'LEGAL.md': `${ARCHIFY}#types/legal`,
  'PRIVACY.md': `${ARCHIFY}#types/privacy`,
  'SECURITY.md': `${ARCHIFY}#types/security`,
  'TRADEMARKS.md': `${ARCHIFY}#types/trademarks`,
};

function internalPath(href: string): string | null {
  const name = href.trim().split('/').pop() || '';
  return DOC_ROUTES[name] || null;
}

function safeExternal(href: string): string | null {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return null;
}

function renderInline(source: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index}`;
    index += 1;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const label = link[1];
        const href = link[2];
        const internal = internalPath(href);
        const external = safeExternal(href);
        if (internal && (internal.includes('.html') || internal.startsWith('http'))) {
          nodes.push(<a key={key} href={internal}>{label}</a>);
        } else if (internal) nodes.push(<Link key={key} to={internal}>{label}</Link>);
        else if (external) nodes.push(<a key={key} href={external} rel="noreferrer">{label}</a>);
        else nodes.push(<span key={key}>{label}</span>);
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

function isTableLine(line: string): boolean {
  return line.includes('|');
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (level === 1 || level === 2 || level === 3 || level === 4) {
        blocks.push({ kind: 'h', level, text: heading[2] });
      }
      i += 1;
      continue;
    }
    if (isTableLine(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i]) && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', text: quote.join(' ') });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length
      && lines[i].trim()
      && !lines[i].startsWith('#')
      && !lines[i].startsWith('```')
      && !lines[i].startsWith('>')
      && !/^[-*]\s+/.test(lines[i])
      && !/^\d+\.\s+/.test(lines[i])
      && !/^---+$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }
  return blocks;
}

function BlockView({ block, index }: { block: Block; index: number }): React.ReactElement {
  const key = `b-${index}`;
  switch (block.kind) {
    case 'h': {
      if (block.level === 1) return <h1 key={key}>{renderInline(block.text, key)}</h1>;
      if (block.level === 2) return <h2 key={key}>{renderInline(block.text, key)}</h2>;
      if (block.level === 3) return <h3 key={key}>{renderInline(block.text, key)}</h3>;
      return <h4 key={key}>{renderInline(block.text, key)}</h4>;
    }
    case 'p':
      return <p key={key}>{renderInline(block.text, key)}</p>;
    case 'ul':
      return (
        <ul key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return <blockquote key={key}>{renderInline(block.text, key)}</blockquote>;
    case 'code':
      return <pre key={key}><code>{block.text}</code></pre>;
    case 'hr':
      return <hr key={key} />;
    case 'table':
      return (
        <div className="table-scroll" key={key}>
          <table>
            <thead>
              <tr>
                {block.headers.map((header, headerIndex) => (
                  <th key={`${key}-h-${headerIndex}`}>{renderInline(header, `${key}-h-${headerIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${key}-r-${rowIndex}`}>
                  {block.headers.map((_, cellIndex) => (
                    <td key={`${key}-c-${rowIndex}-${cellIndex}`}>
                      {renderInline(row[cellIndex] || '', `${key}-c-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}

const MarkdownView: React.FC<{ source: string }> = ({ source }) => (
  <>
    {parseBlocks(source).map((block, index) => (
      <BlockView key={index} block={block} index={index} />
    ))}
  </>
);

export default MarkdownView;
