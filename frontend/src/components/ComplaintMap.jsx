import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import '../lib/leafletIcons';

export default function ComplaintMap({ latitude, longitude, address }) {
  if (latitude == null || longitude == null) return null;
  const position = [latitude, longitude];

  return (
    <div className="overflow-hidden border border-paper-line dark:border-board-line" style={{ height: 220 }}>
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>{address && <Popup>{address}</Popup>}</Marker>
      </MapContainer>
    </div>
  );
}
