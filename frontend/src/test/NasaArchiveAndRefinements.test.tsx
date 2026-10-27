import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { App } from '../App';
import { PlanetaryDossierDrawer } from '../components/imagery/PlanetaryDossierDrawer';
import { NasaArchiveView } from '../components/nasaArchive/NasaArchiveView';
import { DEFAULT_PLANETARY_DESTINATIONS } from '../utils/planetaryCatalog';
import * as nasaApi from '../api/nasaArchiveApi';
import { navigationHistory } from '../utils/navigationHistory';

// Mock WebGL and Canvas
beforeEach(() => {
  navigationHistory.clear();
  window.history.pushState({}, '', '/');
  vi.restoreAllMocks();
});

describe('ASTRA Refinements & NASA Imagery Suite', () => {
  describe('Requirement 1 & 2: Responsive Landing & ABOUT Navigation', () => {
    it('renames the landing-page navigation item to "About" without "Engineer Dossier"', () => {
      render(<App />);

      // Settled / landing page About button
      const aboutBtn = screen.getByTestId('entry-about-me');
      expect(aboutBtn).toBeInTheDocument();
      expect(aboutBtn).toHaveTextContent(/ABOUT/i);
      expect(aboutBtn).not.toHaveTextContent(/ENGINEER DOSSIER/i);
      expect(aboutBtn).not.toHaveTextContent(/SYSTEMS ARCHITECT/i);

      // Header About button
      const headerAboutBtn = screen.getByTestId('header-about-btn');
      expect(headerAboutBtn).toBeInTheDocument();
      expect(headerAboutBtn).toHaveTextContent(/ABOUT/i);
    });

    it('clicking About opens the About page at top-level heading without jumping to projects', async () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      render(<App />);
      const aboutBtn = screen.getByTestId('entry-about-me');
      fireEvent.click(aboutBtn);

      expect(screen.getByTestId('about-me-view')).toBeInTheDocument();
      expect(screen.getByTestId('about-hero-section')).toBeInTheDocument();

      // Verified scrollTo(0, 0) was invoked to avoid scroll jump
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('Requirement 3: Distinct Visual Treatment for "Shiv" and "Kumar"', () => {
    it('renders "Shiv" and "Kumar" on two distinct styled elements with proper hierarchy', () => {
      navigationHistory.push({ viewMode: 'about' });
      render(<App />);

      const nameEl = screen.getByTestId('about-name');
      const firstLine = nameEl.querySelector('.astra-name-first');
      const lastLine = nameEl.querySelector('.astra-name-last');

      expect(firstLine).toBeInTheDocument();
      expect(firstLine).toHaveTextContent('Shiv');
      expect(lastLine).toBeInTheDocument();
      expect(lastLine).toHaveTextContent('Kumar');
    });
  });

  describe('Requirement 5: Solar System Reset to start at Sun', () => {
    it('initializes Space Imagery with the Sun as the active celestial body', async () => {
      navigationHistory.push({ viewMode: 'space-imagery' });
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('space-imagery-view')).toBeInTheDocument();
      });

      // Default catalogue order begins with the Sun
      expect(DEFAULT_PLANETARY_DESTINATIONS[0].id).toBe('sun');
      expect(DEFAULT_PLANETARY_DESTINATIONS[0].name).toBe('Sun');
      expect(DEFAULT_PLANETARY_DESTINATIONS[0].orbitalOrder).toBe(0);

      // Verify Sun stage is present and in view
      const sunStage = screen.getByTestId('section-sun');
      expect(sunStage).toBeInTheDocument();
      expect(within(sunStage).getByRole('heading', { name: /^sun$/i })).toBeInTheDocument();

      // Verify Sun is active in navigator
      const sunNavItem = screen.getByTestId('nav-item-sun');
      expect(sunNavItem).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('Requirement 6: Simplified Dossier Close Control (× only)', () => {
    it('renders a simple minimal × close icon button with aria-label="Close dossier"', () => {
      const handleClose = vi.fn();
      const sun = DEFAULT_PLANETARY_DESTINATIONS[0];

      render(
        <PlanetaryDossierDrawer
          destination={sun}
          isOpen={true}
          onClose={handleClose}
          onOpenArchive={vi.fn()}
          onSelectImage={vi.fn()}
        />
      );

      const closeBtn = screen.getByTestId('collapse-world-sun');
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toHaveAttribute('aria-label', expect.stringContaining('Close dossier'));
      expect(closeBtn).not.toHaveTextContent(/CLOSE DOSSIER/i);
      expect(closeBtn).not.toHaveTextContent(/\[ESC\]/i);

      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Requirement 7: Dynamic NASA Image Archive Destination', () => {
    const mockNasaItems = [
      {
        nasaId: 'PIA14417',
        title: 'Weighing in on the Dumbbell Nebula',
        description: 'Planetary nebulae are remains of stars that once looked like our sun.',
        dateCreated: '2011-08-10T21:00:09Z',
        center: 'JPL',
        secondaryCreator: 'NASA/JPL-Caltech',
        keywords: ['Helix Nebula', 'Spitzer'],
        thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA14417/PIA14417~thumb.jpg',
        fullImageUrl: 'https://images-assets.nasa.gov/image/PIA14417/PIA14417~medium.jpg',
        mediaType: 'image',
      },
      {
        nasaId: 'PIA15418',
        title: 'Andromeda Galaxy in High Resolution',
        description: 'Spiral galaxy closest to our Milky Way.',
        dateCreated: '2015-01-05T12:00:00Z',
        center: 'GSFC',
        secondaryCreator: 'NASA/ESA',
        keywords: ['Galaxy', 'Hubble'],
        thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA15418/PIA15418~thumb.jpg',
        fullImageUrl: 'https://images-assets.nasa.gov/image/PIA15418/PIA15418~medium.jpg',
        mediaType: 'image',
      },
    ];

    it('renders NASA IMAGE ARCHIVE destination card on landing page and navigates to archive view', () => {
      render(<App />);

      const nasaCard = screen.getByTestId('entry-nasa-archive');
      expect(nasaCard).toBeInTheDocument();
      expect(within(nasaCard).getByText(/III\. NASA IMAGE ARCHIVE/i)).toBeInTheDocument();

      fireEvent.click(nasaCard);
      expect(screen.getByTestId('nasa-archive-view')).toBeInTheDocument();
    });

    it('fetches and displays real NASA archive imagery with metadata and inspection modal', async () => {
      vi.spyOn(nasaApi, 'fetchNasaArchiveItems').mockResolvedValue(mockNasaItems);

      render(<NasaArchiveView onReturnHome={vi.fn()} />);

      // Shows loading skeleton initially
      expect(screen.getByTestId('nasa-loading-grid')).toBeInTheDocument();

      // Populates real items
      await waitFor(() => {
        expect(screen.getByTestId('nasa-image-grid')).toBeInTheDocument();
      });

      expect(screen.getByText('Weighing in on the Dumbbell Nebula')).toBeInTheDocument();
      expect(screen.getByText('Andromeda Galaxy in High Resolution')).toBeInTheDocument();

      // Click card to open modal inspection
      const firstCard = screen.getByTestId('nasa-card-PIA14417');
      fireEvent.click(firstCard);

      const modal = screen.getByTestId('nasa-archive-modal');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByTestId('nasa-modal-title')).toHaveTextContent('Weighing in on the Dumbbell Nebula');
      expect(within(modal).getByText(/CENTER: JPL/i)).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByTestId('nasa-modal-close-btn');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('nasa-archive-modal')).not.toBeInTheDocument();
    });

    it('handles NASA API failure gracefully with retry banner and no black screen', async () => {
      vi.spyOn(nasaApi, 'fetchNasaArchiveItems').mockRejectedValue(
        new Error('NASA Image Gateway connection timeout')
      );

      render(<NasaArchiveView onReturnHome={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId('nasa-error-banner')).toBeInTheDocument();
      });

      expect(screen.getByText(/GATEWAY CONNECTION ANOMALY/i)).toBeInTheDocument();
      expect(screen.getByText(/NASA Image Gateway connection timeout/i)).toBeInTheDocument();
      expect(screen.getByTestId('nasa-retry-btn')).toBeInTheDocument();
    });
  });

  describe('Requirement 1: Viewport and Responsive Integrity', () => {
    const viewports = [
      { name: 'Small Phone', width: 320, height: 568 },
      { name: 'Standard Phone', width: 375, height: 667 },
      { name: 'Large Phone', width: 430, height: 932 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Small Laptop', width: 1024, height: 768 },
      { name: 'Standard Desktop', width: 1440, height: 900 },
      { name: 'Large Desktop', width: 1920, height: 1080 },
    ];

    viewports.forEach((vp) => {
      it(`renders landing page without breaking layout at ${vp.name} (${vp.width}x${vp.height})`, () => {
        window.innerWidth = vp.width;
        window.innerHeight = vp.height;

        render(<App />);

        expect(screen.getByTestId('astra-app')).toBeInTheDocument();
        expect(screen.getByTestId('primary-entry-points')).toBeInTheDocument();
        expect(screen.getByTestId('entry-about-me')).toBeInTheDocument();
      });
    });
  });
});
