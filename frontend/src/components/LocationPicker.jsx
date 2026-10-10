import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import '../lib/leafletIcons';
import apiClient from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_CENTER = [20.5937, 78.9629]; // India centroid — used only until a pin is dropped
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 16;

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

function LocateControl({ onLocate, disabled }) {
  const { t } = useLanguage();
  const map = useMap();
  const [locating, setLocating] = useState(false);

  function handleClick(e) {
    e.stopPropagation();
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], SELECTED_ZOOM);
        onLocate({ lat: latitude, lng: longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || locating}
      className="absolute top-2 right-2 z-[1000] px-2.5 py-1 text-xs font-medium bg-white dark:bg-board text-ink dark:text-paper border border-paper-line dark:border-board-line hover:border-brass disabled:opacity-50"
    >
      {locating ? t('Locating…') : `📍 ${t('Use my location')}`}
    </button>
  );
}

export default function LocationPicker({ latitude, longitude, onLocationChange, onAddressChange, disabled }) {
  const { t } = useLanguage();
  const [geocoding, setGeocoding] = useState(false);
  const position = latitude != null && longitude != null ? [latitude, longitude] : null;

  async function handleSelect(latlng) {
    if (disabled) return;
    onLocationChange(latlng.lat, latlng.lng);
    setGeocoding(true);
    try {
      const { data } = await apiClient.get('/geo/reverse', { params: { lat: latlng.lat, lon: latlng.lng } });
      if (data.address) onAddressChange(data.address);
    } catch {
      // Reverse geocoding is best-effort; the pin is still placed even if this fails.
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden border border-paper-line dark:border-board-line" style={{ height: 260 }}>
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? SELECTED_ZOOM : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={handleSelect} />
          <LocateControl onLocate={handleSelect} disabled={disabled} />
          {position && <Marker position={position} />}
        </MapContainer>
      </div>
      <p className="text-xs text-ink-soft mt-1">
        {geocoding
          ? t('Looking up address…')
          : position
          ? `${t('Pinned')}: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
          : t('Click the map (or use your location) to pin the exact spot')}
      </p>
    </div>
  );
}
