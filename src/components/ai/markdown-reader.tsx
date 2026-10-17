'use client';

import React, { useState } from 'react';
import {
  AiResult,
  AiSourceCitation,
  AiStructuredSection,
  AiChecklistItem,
} from '@/types/ai';
import {
  ExternalLink,
  Copy,
  Check,
  CheckSquare,
  Square,
  Globe,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';

interface MarkdownReaderProps {
  result: AiResult;
}

// Sanitizes URLs to prevent javascript: and dangerous schemas
export function sanitizeUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

// Sanitizes raw strings against HTML injection
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function MarkdownReader({ result }: MarkdownReaderProps) {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'formatted' | 'raw'>('formatted');

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-semibold text-white">{result.actionName}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(result.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView(activeView === 'formatted' ? 'raw' : 'formatted')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
          >
            {activeView === 'formatted' ? (
              <>
                <FileText className="w-3 h-3" /> Raw Text
              </>
            ) : (
              <>
                <Layers className="w-3 h-3" /> Formatted
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
            title="Copy response to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Raw View */}
      {activeView === 'raw' ? (
        <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs whitespace-pre-wrap overflow-x-auto text-slate-300 leading-relaxed">
          {result.content}
        </pre>
      ) : (
        /* Formatted View */
        <div className="space-y-4">
          {/* If structured sections exist */}
          {result.sections && result.sections.length > 0 ? (
            <div className="space-y-3">
              {result.sections.map((section: AiStructuredSection, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-1.5"
                >
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {section.title}
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pl-4 border-l border-blue-500/30">
                    <FormattedMarkdown text={section.body} />
                  </div>
                </div>
              ))}
            </div>
          ) : result.checklistItems && result.checklistItems.length > 0 ? (
            /* If checklist items exist */
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 pb-1 border-b border-white/5">
                Actionable Checklist
              </h4>
              <div className="space-y-2">
                {result.checklistItems.map((item: AiChecklistItem, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    {item.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    )}
                    <span className={item.completed ? 'line-through text-slate-400' : ''}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Safe Markdown Render */
            <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-slate-300">
              <FormattedMarkdown text={result.content} />
            </div>
          )}

          {/* Sourced Research Citations */}
          {result.sources && result.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Verified Research Citations ({result.sources.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {result.sources.map((source: AiSourceCitation, idx: number) => {
                  const safeHref = sanitizeUrl(source.url);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col justify-between hover:border-blue-500/30 transition text-xs"
                    >
                      <div>
                        <strong className="text-white line-clamp-1 block">{source.title}</strong>
                        {source.snippet && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            {source.snippet}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 text-[11px] text-slate-400">
                        <span>{source.publicationDate || 'Verified Source'}</span>
                        {safeHref ? (
                          <a
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            <span>Read source</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Citation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Parses markdown into safe React elements without dangerouslySetInnerHTML
export function FormattedMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1);
      elements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-white/10">
                {header.map((col, idx) => (
                  <th key={idx} className="p-2 font-semibold text-white">
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/5 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 text-slate-300">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code block detection
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="my-3 p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-blue-200 overflow-x-auto"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Markdown Table detection (e.g. | Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      // Skip separator row |---|---|
      if (/^\|[-:\s|]+\|$/.test(trimmed)) {
        return;
      }
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(`table-${index}`);
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={index} className="text-base sm:text-lg font-bold text-white mt-4 mb-2">
          {renderInline(trimmed.substring(2))}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={index} className="text-sm sm:text-base font-bold text-blue-300 mt-3 mb-1.5">
          {renderInline(trimmed.substring(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={index} className="text-xs sm:text-sm font-semibold text-slate-100 mt-2.5 mb-1">
          {renderInline(trimmed.substring(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={index} className="text-xs font-semibold text-slate-200 mt-2 mb-1">
          {renderInline(trimmed.substring(5))}
        </h5>
      );
      return;
    }

    // Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.substring(2);
      // Checklist inside markdown
      const checkMatch = bulletText.match(/^\[([ xX])\]\s*(.+)$/);
      if (checkMatch) {
        const isDone = checkMatch[1].toLowerCase() === 'x';
        elements.push(
          <div key={index} className="flex items-start gap-2 my-1 text-xs">
            {isDone ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            )}
            <span className={isDone ? 'line-through text-slate-400' : ''}>
              {renderInline(checkMatch[2])}
            </span>
          </div>
        );
        return;
      }

      elements.push(
        <div key={index} className="flex items-start gap-2 my-1 text-xs pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
          <span>{renderInline(bulletText)}</span>
        </div>
      );
      return;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div key={index} className="flex items-start gap-2 my-1 text-xs pl-2">
          <span className="font-semibold text-blue-400 shrink-0">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={index} className="my-3 border-white/10" />);
      return;
    }

    // Empty line
    if (trimmed.length === 0) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={index} className="my-1.5 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  if (inTable) {
    flushTable('table-end');
  }

  return <>{elements}</>;
}

// Safely parses inline markdown (bold, italic, code, safe links)
function renderInline(text: string): React.ReactNode {
  // Regex parsing tokens for bold, italic, inline code, and links
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const safeHref = sanitizeUrl(linkMatch[2]);
      if (safeHref) {
        return (
          <a
            key={i}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-0.5"
          >
            <span>{linkText}</span>
            <ExternalLink className="w-2.5 h-2.5 inline" />
          </a>
        );
      }
      return <span key={i}>{linkText}</span>;
    }

    return part;
  });
}
