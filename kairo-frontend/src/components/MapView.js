import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapView({ entries }) {
    // Filter entries with location data
    const entriesWithLocation = entries.filter(e => e.latitude && e.longitude);

    if (entriesWithLocation.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>No entries with location data found.</p>
                <p style={{ fontSize: '0.9rem' }}>Enable location when creating entries to see them on the map!</p>
            </div>
        );
    }

    // Calculate center (average of coordinates)
    const avgLat = entriesWithLocation.reduce((sum, e) => sum + parseFloat(e.latitude), 0) / entriesWithLocation.length;
    const avgLng = entriesWithLocation.reduce((sum, e) => sum + parseFloat(e.longitude), 0) / entriesWithLocation.length;

    return (
        <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <MapContainer center={[avgLat, avgLng]} zoom={3} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {entriesWithLocation.map(entry => (
                    <Marker key={entry.id} position={[parseFloat(entry.latitude), parseFloat(entry.longitude)]}>
                        <Popup>
                            <div style={{ maxWidth: '200px' }}>
                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{new Date(entry.created_at).toLocaleDateString()}</p>
                                <p style={{ margin: 0 }}>{entry.text_content.substring(0, 50)}...</p>
                                {entry.image_url && <img src={entry.image_url} alt="Memory" style={{ width: '100%', marginTop: '5px', borderRadius: '4px' }} />}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

export default MapView;
