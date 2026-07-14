import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return undefined;

    const heatLayer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, 0.6]),
      { radius: 25, blur: 20, maxZoom: 17 }
    );
    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
