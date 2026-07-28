import type { JournalEntry } from '../types';

export interface EntryPresentation {
  title: string;
  body: string;
}

export function getEntryPresentation(entry: JournalEntry): EntryPresentation {
  const normalized = entry.text_content.trim();
  const [firstLine = '', ...remainingLines] = normalized.split(/\r?\n/);
  const remainingBody = remainingLines.join('\n').trim();

  if (remainingBody && firstLine.length <= 92) {
    return { title: firstLine, body: remainingBody };
  }

  if (normalized.length <= 92) {
    return { title: normalized || 'Untitled entry', body: '' };
  }

  const sentence = normalized.match(/^(.{1,72}?)(?:[.!?](?:\s|$)|$)/)?.[1]?.trim();
  const title = sentence && sentence.length >= 8 ? sentence : `${normalized.slice(0, 69).trim()}…`;
  return { title, body: normalized };
}

export function formatEntryDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatEntryDay(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatSentiment(value: string | null): string {
  if (!value) return 'Unclassified';
  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
}
