import { useState } from 'react';
import { Images } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatEntryDay, getEntryPresentation } from '../utils/entries';
import { EmptyState } from './EmptyState';
import { EntryDetailModal } from './EntryDetailModal';
import { PageHeader } from './PageHeader';

interface PhotosViewProps {
    entries: JournalEntry[];
    showPageHeader?: boolean;
}

type EntryWithPhoto = JournalEntry & { image_url: string };

export function PhotosView({ entries, showPageHeader = false }: PhotosViewProps) {
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const entriesWithPhotos = entries.filter(
        (entry): entry is EntryWithPhoto => Boolean(entry.image_url),
    );

    const content = entriesWithPhotos.length === 0 ? (
        <EmptyState
            title="No photos in your journal yet"
            description="Attach an image to an entry and it will become part of this visual archive."
            icon={<Images />}
        />
    ) : (
        <div className="photo-grid">
            {entriesWithPhotos.map((entry) => {
                const presentation = getEntryPresentation(entry);
                return (
                    <figure key={entry.id} className="photo-card clickable-card">
                        <button
                            type="button"
                            className="card-click-target"
                            aria-label={`Open ${presentation.title}`}
                            onClick={() => setSelectedEntry(entry)}
                        />
                        <img src={entry.image_url} alt={`Attachment for ${presentation.title}`} />
                        <figcaption className="photo-caption">
                            <strong>{presentation.title}</strong>
                            <span>{formatEntryDay(entry.created_at)}</span>
                        </figcaption>
                    </figure>
                );
            })}
        </div>
    );

    const detailModal = (
        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    );

    if (!showPageHeader) {
        return (
            <>
                {content}
                {detailModal}
            </>
        );
    }

    return (
        <div className="standalone-view">
            <PageHeader
                eyebrow="Visual memories"
                title="Photos"
                description="A gallery of the places, details, and moments you attached to your entries."
            />
            {content}
            {detailModal}
        </div>
    );
}
