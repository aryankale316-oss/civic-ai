import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import HeatmapLayer from '../components/HeatmapLayer';
import PageTransition from '../components/ui/PageTransition';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import '../lib/leafletIcons';

const DEFAULT_CENTER = [20.5937, 78.9629]; // India centroid — used only if no complaints are geotagged

function clusterRadius(count) {
  return Math.min(10 + count * 4, 40);
}

export default function AdminHotspots() {
  const [data, setData] = useState({ clusters: [], noise: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/complaints/hotspots')
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load hotspots'))
      .finally(() => setLoading(false));
  }, []);

  const allPoints = [
    ...data.clusters.flatMap((c) => c.complaints.map((comp) => ({ lat: comp.latitude, lng: comp.longitude }))),
    ...data.noise.map((comp) => ({ lat: comp.latitude, lng: comp.longitude })),
  ];
  const totalClustered = data.clusters.reduce((sum, c) => sum + c.count, 0);
  const mapCenter = allPoints.length > 0 ? [allPoints[0].lat, allPoints[0].lng] : DEFAULT_CENTER;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <PageTransition className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Complaint Hotspots</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {totalClustered} complaints in {data.clusters.length} hotspot{data.clusters.length === 1 ? '' : 's'}
          {data.noise.length > 0 && `, ${data.noise.length} isolated report${data.noise.length === 1 ? '' : 's'}`}
          {' '}(DBSCAN, 500m radius, min 3 nearby reports to form a hotspot).
        </p>

        {loading && <SkeletonCard />}
        {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {!loading && !error && (
          allPoints.length === 0 ? (
            <EmptyState icon="🗺️" title="No complaints with a pinned location yet" />
          ) : (
            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: 520 }}>
              <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatmapLayer points={allPoints} />

                {data.clusters.map((cluster) => (
                  <CircleMarker
                    key={cluster.cluster_id}
                    center={[cluster.center_lat, cluster.center_lng]}
                    radius={clusterRadius(cluster.count)}
                    pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.45, weight: 2 }}
                  >
                    <Popup maxHeight={220}>
                      <p className="font-medium mb-1">{cluster.count} complaints in this area</p>
                      <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                        {cluster.complaints.map((c) => (
                          <li key={c.id}>
                            <Link to={`/complaints/${c.id}`} target="_blank" rel="noreferrer" className="underline">
                              #{c.id} {c.title}
                            </Link>{' '}
                            — {c.ai_category || 'Uncategorized'} ({c.status})
                          </li>
                        ))}
                      </ul>
                    </Popup>
                  </CircleMarker>
                ))}

                {data.noise.map((c) => (
                  <CircleMarker
                    key={`noise-${c.id}`}
                    center={[c.latitude, c.longitude]}
                    radius={6}
                    pathOptions={{ color: '#64748b', fillColor: '#94a3b8', fillOpacity: 0.6, weight: 1 }}
                  >
                    <Popup>
                      <Link to={`/complaints/${c.id}`} target="_blank" rel="noreferrer" className="underline text-xs">
                        #{c.id} {c.title}
                      </Link>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )
        )}
      </PageTransition>
    </div>
  );
}
