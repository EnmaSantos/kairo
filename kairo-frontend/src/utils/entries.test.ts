import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../types';
import { formatSentiment, getEntryPresentation } from './entries';

const entry = (text_content: string): JournalEntry => ({
  id: 1,
  text_content,
  created_at: '2026-07-27T16:42:00',
  user_id: 2,
  sentiment: 'joy',
  notebook_id: 1,
  image_url: null,
  latitude: null,
  longitude: null,
});

describe('entry presentation', () => {
  it('uses the first line as a title for structured entries', () => {
    expect(getEntryPresentation(entry('A focused start\n\nThree priorities for the week.'))).toEqual({
      title: 'A focused start',
      body: 'Three priorities for the week.',
    });
  });

  it('does not duplicate a short single-line entry', () => {
    expect(getEntryPresentation(entry('Finished the weekly review.'))).toEqual({
      title: 'Finished the weekly review.',
      body: '',
    });
  });

  it('formats sentiment labels for display', () => {
    expect(formatSentiment('surprise')).toBe('Surprise');
    expect(formatSentiment(null)).toBe('Unclassified');
  });
});
