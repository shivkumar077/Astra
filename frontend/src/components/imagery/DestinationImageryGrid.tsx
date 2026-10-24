import React, { useEffect, useState } from 'react';
import { SpaceImageryItem, SpaceImagerySearchResult } from '../../types/imagery';
import { getFeaturedImagery, searchImagery } from '../../api/imageryApi';
import { RefreshCw, AlertCircle, Eye } from 'lucide-react';

interface DestinationImageryGridProps {
  destinationId: string;
  destinationName: string;
  activeQuery?: string;
  onSelectImage: (item: SpaceImageryItem) => void;
}

export const DestinationImageryGrid: React.FC<DestinationImageryGridProps> = ({
  destinationId,
  destinationName,
  activeQuery,
  onSelectImage,
}) => {
  const [result, setResult] = useState<SpaceImagerySearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImagery = () => {
    setLoading(true);
    setError(null);

    const promise = activeQuery
      ? searchImagery({ query: activeQuery, pageSize: 6 })
      : getFeaturedImagery(destinationId);

    promise
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load imagery from NASA archive gateway.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchImagery();
  }, [destinationId, activeQuery]);

  return (
    <div className="astra-destination-gallery" data-testid={`gallery-${destinationId}`}>
      <div className="astra-gallery-header">
        <span className="astra-gallery-title">
          {activeQuery ? `Query Archive: "${activeQuery}"` : `Verified NASA Photography // ${destinationName}`}
        </span>
        {result && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-ghost)',
            }}
          >
            {result.totalHits.toLocaleString()} NASA ARCHIVE RECORDS FOUND
          </span>
        )}
      </div>

      {loading && (
        <div className="astra-imagery-grid" data-testid="gallery-loading">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="astra-skeleton"
              style={{ width: '100%', height: '260px', borderRadius: 'var(--radius-xs)' }}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="astra-error-banner" data-testid="gallery-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-critical)' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '13px' }}>{error}</span>
          </div>
          <button onClick={fetchImagery} className="astra-return-btn" style={{ padding: '4px 10px' }}>
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!loading && !error && result && result.items.length === 0 && (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-xs)',
          }}
          data-testid="gallery-empty"
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
            No media records returned for this target celestial archive.
          </p>
        </div>
      )}

      {!loading && !error && result && result.items.length > 0 && (
        <div className="astra-imagery-grid" data-testid="gallery-items">
          {result.items.map((item) => (
            <button
              key={item.nasaId}
              onClick={() => onSelectImage(item)}
              className="astra-imagery-card"
              aria-label={`Inspect ${item.title}`}
              data-testid={`image-card-${item.nasaId}`}
            >
              <div className="astra-card-image-wrap">
                <img
                  src={item.thumbnailUrl || ''}
                  alt={item.title}
                  className="astra-card-img"
                  loading="lazy"
                />
                <span className="astra-card-badge">{item.nasaId}</span>
              </div>

              <div className="astra-card-content">
                <span className="astra-card-title">{item.title}</span>

                <div className="astra-card-meta">
                  <span>{item.center || 'NASA'}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={11} /> Inspect
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
