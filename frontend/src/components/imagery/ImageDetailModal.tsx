import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Download, Layers } from 'lucide-react';
import { SpaceImageryAssetManifest, SpaceImageryItem } from '../../types/imagery';
import { getAssetManifest } from '../../api/imageryApi';

interface ImageDetailModalProps {
  item: SpaceImageryItem | null;
  onClose: () => void;
}

export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ item, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [manifest, setManifest] = useState<SpaceImageryAssetManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState<boolean>(false);

  useEffect(() => {
    if (!item) {
      setManifest(null);
      return;
    }

    closeButtonRef.current?.focus();

    // Trap Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Fetch manifest links on demand
    let isMounted = true;
    setLoadingManifest(true);
    getAssetManifest(item.nasaId)
      .then((data) => {
        if (isMounted) {
          setManifest(data);
          setLoadingManifest(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingManifest(false);
        }
      });

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="astra-detail-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      data-testid="image-detail-modal"
    >
      <div className="astra-detail-modal">
        {/* Modal Header */}
        <div className="astra-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-earth-cyan)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              NASA ID: {item.nasaId}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-text-ghost)',
              }}
            >
              // {item.center}
            </span>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="astra-return-btn"
            style={{ padding: '4px 8px' }}
            aria-label="Close image details dialog"
            data-testid="close-detail-modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scroll Area */}
        <div className="astra-modal-scroll-area">
          {/* Main Visual Frame */}
          <div className="astra-modal-img-wrap">
            <img
              src={item.previewUrl || item.thumbnailUrl || ''}
              alt={item.title}
              className="astra-modal-img"
              loading="eager"
            />
          </div>

          {/* Title & Scientific Description */}
          <div>
            <h2
              id="detail-modal-title"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--color-text-display)',
                margin: '0 0 10px',
              }}
            >
              {item.title}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: 'var(--color-text-body)',
                whiteSpace: 'pre-line',
                margin: 0,
              }}
            >
              {item.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="astra-modal-meta-grid">
            <div className="astra-meta-item">
              <span className="astra-meta-label">Capture Date</span>
              <span className="astra-meta-val">
                {item.dateCreated ? new Date(item.dateCreated).toLocaleDateString() : 'ARCHIVAL'}
              </span>
            </div>

            <div className="astra-meta-item">
              <span className="astra-meta-label">NASA Center</span>
              <span className="astra-meta-val">{item.center || 'NASA HQ'}</span>
            </div>

            {item.secondaryCreator && (
              <div className="astra-meta-item">
                <span className="astra-meta-label">Scientific Consortium</span>
                <span className="astra-meta-val">{item.secondaryCreator}</span>
              </div>
            )}

            {item.photographer && (
              <div className="astra-meta-item">
                <span className="astra-meta-label">Photographer</span>
                <span className="astra-meta-val">{item.photographer}</span>
              </div>
            )}

            <div className="astra-meta-item">
              <span className="astra-meta-label">Attribution</span>
              <span className="astra-meta-val">{item.attribution}</span>
            </div>
          </div>

          {/* Asset Resolution Links from Backend Gateway */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-text-ghost)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <Layers size={13} />
              <span>Available Direct Asset Resolutions</span>
            </div>

            {loadingManifest ? (
              <div
                className="astra-skeleton"
                style={{ width: '100%', height: '36px' }}
                data-testid="manifest-skeleton"
              />
            ) : manifest ? (
              <div className="astra-resolution-links" data-testid="resolution-links">
                {manifest.originalAssetUrl && (
                  <a
                    href={manifest.originalAssetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resolution-pill"
                    download
                  >
                    <Download size={12} />
                    <span>Original Raw Asset</span>
                  </a>
                )}
                {manifest.largeAssetUrl && (
                  <a
                    href={manifest.largeAssetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resolution-pill"
                  >
                    <ExternalLink size={12} />
                    <span>4K Large</span>
                  </a>
                )}
                {manifest.mediumAssetUrl && (
                  <a
                    href={manifest.mediumAssetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resolution-pill"
                  >
                    <ExternalLink size={12} />
                    <span>Medium</span>
                  </a>
                )}
                {manifest.smallAssetUrl && (
                  <a
                    href={manifest.smallAssetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resolution-pill"
                  >
                    <ExternalLink size={12} />
                    <span>Small Web</span>
                  </a>
                )}
              </div>
            ) : (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text-ghost)',
                  margin: 0,
                }}
              >
                Direct resolution manifest unavailable.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
