
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from 'react-leaflet';
import apiClient from '../api/client';
import AdminShell from '../components/AdminShell';
import HeatmapLayer from '../components/HeatmapLayer';
import PageTransition from '../components/ui/PageTransition';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import '../lib/leafletIcons';

const DEFAULT_CENTER = [20.5937, 78.9629];

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
    ...data.clusters.flatMap((c) =>
      c.complaints.map((comp) => ({
        lat: comp.latitude,
        lng: comp.longitude,
      }))
    ),
    ...data.noise.map((comp) => ({
      lat: comp.latitude,
      lng: comp.longitude,
    })),
  ];

  const totalClustered = data.clusters.reduce(
    (sum, c) => sum + c.count,
    0
  );

  const mapCenter =
    allPoints.length > 0
      ? [allPoints[0].lat, allPoints[0].lng]
      : DEFAULT_CENTER;

  return (
    <AdminShell>
      <PageTransition className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">
          Field intelligence
        </p>

        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink dark:text-paper">
          Complaint hotspots
        </h1>

        <p className="mb-6 text-sm font-mono text-ink-soft">
          {totalClustered} complaints in {data.clusters.length} hotspot
          {data.clusters.length === 1 ? '' : 's'}
          {data.noise.length > 0 &&
            `, ${data.noise.length} isolated report${
              data.noise.length === 1 ? '' : 's'
            }`}
          {' '}(DBSCAN, 500m radius, min 3 nearby reports to form a
          hotspot).
        </p>

        {loading && <SkeletonCard />}

        {error && (
          <p className="mb-4 text-stamp-red">{error}</p>
        )}

        {!loading &&
          !error &&
          (allPoints.length === 0 ? (
            <EmptyState
              icon="🗺️"
              title="No complaints with a pinned location yet"
            />
          ) : (
            <div
              className="overflow-hidden rounded-lg border border-paper-line bg-white dark:border-board-line dark:bg-board"
              style={{ height: 560 }}
            >
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <HeatmapLayer points={allPoints} />

                {data.clusters.map((cluster) => (
                  <CircleMarker
                    key={cluster.cluster_id}
                    center={[
                      cluster.center_lat,
                      cluster.center_lng,
                    ]}
                    radius={clusterRadius(cluster.count)}
                    pathOptions={{
                      color: '#b23a2e',
                      fillColor: '#b23a2e',
                      fillOpacity: 0.4,
                      weight: 2,
                    }}
                  >
                    <Popup maxHeight={220}>
                      <p className="mb-1 font-medium">
                        {cluster.count} complaints in this area
                      </p>

                      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                        {cluster.complaints.map((c) => (
                          <li key={c.id}>
                            <Link
                              to={`/complaints/${c.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              #{c.id} {c.title}
                            </Link>{' '}
                            — {c.ai_category || 'Uncategorized'} (
                            {c.status})
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
                    pathOptions={{
                      color: '#5b6472',
                      fillColor: '#b8893e',
                      fillOpacity: 0.55,
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <Link
                        to={`/complaints/${c.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        #{c.id} {c.title}
                      </Link>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          ))}
      </PageTransition>
    </AdminShell>
  );
}
