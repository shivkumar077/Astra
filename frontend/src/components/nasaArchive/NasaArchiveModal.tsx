import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, Calendar, MapPin, User } from 'lucide-react';
import { NasaArchiveItem } from '../../types/nasaArchive';
import { SignatureStar } from '../common/CelestialIcons';

interface NasaArchiveModalProps {
  item: NasaArchiveItem | null;
  onClose: () => void;
}

export const NasaArchiveModal: React.FC<NasaArchiveModalProps> = ({ item, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;

    // Focus close button on mount
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  // Format date nicely (e.g. 2021.08.10)
  let formattedDate = item.dateCreated;
  try {
    if (item.dateCreated) {
      const d = new Date(item.dateCreated);
      if (!isNaN(d.getTime())) {
        const yr = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
        const da = String(d.getUTCDate()).padStart(2, '0');
        formattedDate = `${yr}.${mo}.${da}`;
      }
    }
  } catch (_) {}

  return (
    <div
      className="astra-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 5, 10, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      data-testid="nasa-archive-modal"
    >
      <div
        className="astra-nasa-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          backgroundColor: 'rgba(10, 14, 22, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '4px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 32px rgba(56, 189, 248, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(6, 9, 15, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SignatureStar size={11} color="var(--color-star-warm)" strokeWidth={1.5} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              [ NASA OBSERVATIONAL RECORD // ID: {item.nasaId} ]
            </span>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="astra-dossier-close-icon-btn"
            aria-label="Close modal"
            data-testid="nasa-modal-close-btn"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Main High-Res Image Display */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '480px',
              borderRadius: '2px',
              overflow: 'hidden',
              backgroundColor: '#020408',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={item.fullImageUrl || item.thumbnailUrl}
              alt={item.title}
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => {
                // If high-res fails, fall back to thumbnail
                if (item.thumbnailUrl && (e.currentTarget as HTMLImageElement).src !== item.thumbnailUrl) {
                  (e.currentTarget as HTMLImageElement).src = item.thumbnailUrl;
                }
              }}
            />
          </div>

          {/* Title & Metadata Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(20px, 2.5vw, 28px)',
                fontWeight: 600,
                color: 'var(--color-text-display)',
                letterSpacing: '0.02em',
                margin: 0,
                lineHeight: 1.25,
              }}
              data-testid="nasa-modal-title"
            >
              {item.title}
            </h2>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              {formattedDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} color="var(--color-star-warm)" />
                  <span>{formattedDate}</span>
                </span>
              )}
              {item.center && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} color="var(--color-earth-cyan)" />
                  <span>CENTER: {item.center}</span>
                </span>
              )}
              {item.secondaryCreator && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} color="var(--color-star-ivory)" />
                  <span>CREDIT: {item.secondaryCreator}</span>
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13.5px',
              lineHeight: 1.65,
              color: 'var(--color-text-body)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px',
              borderRadius: '2px',
            }}
          >
            <p style={{ margin: 0 }}>{item.description}</p>
          </div>

          {/* Keywords */}
          {item.keywords && item.keywords.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-ghost)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                KEYWORDS:
              </span>
              {item.keywords.map((kw, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    padding: '3px 8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Official Attribution & External NASA Link */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                color: 'var(--color-text-ghost)',
                letterSpacing: '0.06em',
              }}
            >
              SOURCE: NASA IMAGE AND VIDEO LIBRARY API
            </span>

            <a
              href={`https://images.nasa.gov/details/${encodeURIComponent(item.nasaId)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-earth-cyan)',
                letterSpacing: '0.08em',
                textDecoration: 'none',
              }}
              aria-label={`View ${item.title} on official NASA Images website`}
            >
              <span>NASA ARCHIVE RECORD</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
