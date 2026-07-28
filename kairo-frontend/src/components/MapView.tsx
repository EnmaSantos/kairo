import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPinned } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatEntryDay, getEntryPresentation } from '../utils/entries';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
    entries: JournalEntry[];
    showPageHeader?: boolean;
}

type LocatedEntry = JournalEntry & { latitude: number; longitude: number };

export function MapView({ entries, showPageHeader = false }: MapViewProps) {
    const entriesWithLocation = entries.filter(
        (entry): entry is LocatedEntry => entry.latitude !== null && entry.longitude !== null,
    );

    const content = entriesWithLocation.length === 0 ? (
        <EmptyState
            title="No places recorded yet"
            description="Attach your location to an entry and it will appear on this map."
            icon={<MapPinned />}
        />
    ) : (
        <div className="map-frame">
            <MapContainer
                center={[
                    entriesWithLocation.reduce((sum, entry) => sum + entry.latitude, 0) / entriesWithLocation.length,
                    entriesWithLocation.reduce((sum, entry) => sum + entry.longitude, 0) / entriesWithLocation.length,
                ]}
                zoom={4}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {entriesWithLocation.map((entry) => {
                    const presentation = getEntryPresentation(entry);
                    return (
                        <Marker key={entry.id} position={[entry.latitude, entry.longitude]}>
                            <Popup>
                                <strong>{presentation.title}</strong>
                                <p>{formatEntryDay(entry.created_at)}</p>
                                {presentation.body && <p>{presentation.body.substring(0, 120)}</p>}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );

    if (!showPageHeader) return content;

    return (
        <div className="standalone-view">
            <PageHeader
                eyebrow="Places"
                title="Map"
                description="See where meaningful thoughts and memories became part of your journal."
            />
            {content}
        </div>
    );
}
