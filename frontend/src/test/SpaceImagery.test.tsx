import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpaceImageryView } from '../components/imagery/SpaceImageryView';
import { PlanetVisual } from '../components/imagery/PlanetVisual';
import { RoverShowcase } from '../components/imagery/RoverShowcase';
import * as imageryApi from '../api/imageryApi';
import { PlanetaryDestination, SpaceImagerySearchResult, SpaceImageryAssetManifest } from '../types/imagery';

const MOCK_DESTINATIONS: PlanetaryDestination[] = [
  {
    id: 'sun',
    name: 'Sun',
    type: 'STAR',
    orbitalOrder: 0,
    layoutComposition: 'LEFT_PLANET',
    summary: 'The central star of the Solar System.',
    historicalMissions: [
      {
        missionCode: 'PARKER',
        missionName: 'Parker Solar Probe',
        operatorAgency: 'NASA',
        launchYear: 2018,
        operationalStatus: 'OPERATIONAL',
        targetBody: 'Sun',
        description: 'First probe to touch the Sun.',
        primarySearchQuery: 'Parker Solar Probe',
      },
    ],
    activeRovers: [],
    presetQueries: ['Sun corona', 'Solar flare CME'],
    sourceAttribution: 'NASA Heliophysics',
    verificationNote: 'Verified solar science archive.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'TERRESTRIAL_PLANET',
    orbitalOrder: 1,
    layoutComposition: 'LEFT_PLANET',
    summary: 'The innermost planet with an iron-rich core.',
    historicalMissions: [
      {
        missionCode: 'MESSENGER',
        missionName: 'MESSENGER',
        operatorAgency: 'NASA',
        launchYear: 2004,
        operationalStatus: 'COMPLETED',
        targetBody: 'Mercury',
        description: 'First probe to orbit Mercury.',
        primarySearchQuery: 'MESSENGER Mercury',
      },
    ],
    activeRovers: [],
    presetQueries: ['Mercury crater'],
    sourceAttribution: 'NASA / JHUAPL',
    verificationNote: 'Verified Mercury records.',
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'TERRESTRIAL_PLANET',
    orbitalOrder: 4,
    layoutComposition: 'RIGHT_PLANET',
    summary: 'The Red Planet, home to active rovers.',
    historicalMissions: [
      {
        missionCode: 'MSL',
        missionName: 'Mars Science Laboratory',
        operatorAgency: 'NASA',
        launchYear: 2011,
        operationalStatus: 'OPERATIONAL',
        targetBody: 'Mars',
        description: 'Delivered Curiosity rover.',
        primarySearchQuery: 'Curiosity rover',
      },
    ],
    activeRovers: [
      {
        roverName: 'Perseverance',
        landingSite: 'Jezero Crater',
        landingYear: 2021,
        operationalStatus: 'ACTIVE',
        instruments: ['Mastcam-Z', 'SuperCam', 'MOXIE'],
        primarySearchQuery: 'Perseverance Jezero',
      },
      {
        roverName: 'Curiosity',
        landingSite: 'Gale Crater',
        landingYear: 2012,
        operationalStatus: 'ACTIVE',
        instruments: ['Mastcam', 'ChemCam', 'MAHLI'],
        primarySearchQuery: 'Curiosity Gale Crater',
      },
    ],
    presetQueries: ['Mars Perseverance', 'Mars Curiosity'],
    sourceAttribution: 'NASA / JPL-Caltech',
    verificationNote: 'Verified Mars records.',
  },
];

const MOCK_FEATURED_SEARCH: SpaceImagerySearchResult = {
  query: 'Mars Perseverance',
  page: 1,
  pageSize: 6,
  totalHits: 42,
  totalPages: 7,
  hasMore: true,
  items: [
    {
      nasaId: 'PIA25687',
      title: 'Perseverance Self-Portrait at Belva Crater',
      description: 'NASA Perseverance rover captured this selfie.',
      dateCreated: '2023-04-22T00:00:00Z',
      mediaType: 'image',
      center: 'JPL',
      photographer: null,
      secondaryCreator: 'NASA/JPL-Caltech/MSSS',
      keywords: ['Mars', 'Perseverance', 'Rover'],
      thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~thumb.jpg',
      previewUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~medium.jpg',
      assetManifestUrl: '/api/v1/imagery/assets/PIA25687',
      attribution: 'NASA / JPL-Caltech / MSSS',
    },
  ],
};

const MOCK_ASSET_MANIFEST: SpaceImageryAssetManifest = {
  nasaId: 'PIA25687',
  originalAssetUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~orig.jpg',
  largeAssetUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~large.jpg',
  mediumAssetUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~medium.jpg',
  smallAssetUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~small.jpg',
  thumbnailAssetUrl: 'https://images-assets.nasa.gov/image/PIA25687/PIA25687~thumb.jpg',
  assets: [],
};

describe('ASTRA Space Imagery Redesign V1 — Immersive Solar System Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(imageryApi, 'getPlanetaryDestinations').mockResolvedValue(MOCK_DESTINATIONS);
    vi.spyOn(imageryApi, 'getFeaturedImagery').mockResolvedValue(MOCK_FEATURED_SEARCH);
    vi.spyOn(imageryApi, 'searchImagery').mockImplementation(async (params) => ({
      ...MOCK_FEATURED_SEARCH,
      query: params.query || 'NASA Query',
    }));
    vi.spyOn(imageryApi, 'getAssetManifest').mockResolvedValue(MOCK_ASSET_MANIFEST);
  });

  it('renders the Space Imagery view with gateway connectivity indicator, compact solar navigator, and Sun opening scene', async () => {
    const handleReturn = vi.fn();
    render(<SpaceImageryView onReturnHome={handleReturn} />);

    // Gateway connected telemetry badge
    expect(screen.getByTestId('gateway-status')).toHaveTextContent(/GATEWAY: NASA IMAGES API \[CONNECTED\]/i);

    // Initial loading skeleton
    expect(screen.getByTestId('destinations-loading')).toBeInTheDocument();

    // Await destinations loaded
    await waitFor(() => {
      expect(screen.getByTestId('solar-system-navigator')).toBeInTheDocument();
    });

    // Check navigator items
    expect(screen.getByTestId('nav-item-sun')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-mercury')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-mars')).toBeInTheDocument();

    // Opening scene is the Sun
    expect(screen.getByTestId('section-sun')).toBeInTheDocument();
    expect(within(screen.getByTestId('section-sun')).getByText('Sun')).toBeInTheDocument();
  });

  it('triggers return home when operator clicks the return button', async () => {
    const handleReturn = vi.fn();
    render(<SpaceImageryView onReturnHome={handleReturn} />);

    const returnBtn = screen.getByTestId('return-to-landing');
    fireEvent.click(returnBtn);

    expect(handleReturn).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to return to landing view when modal is closed', async () => {
    const handleReturn = vi.fn();
    render(<SpaceImageryView onReturnHome={handleReturn} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleReturn).toHaveBeenCalledTimes(1);
  });

  it('renders real destination catalog data with historical missions and rovers', async () => {
    render(<SpaceImageryView onReturnHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('section-mars')).toBeInTheDocument();
    });

    const marsSection = screen.getByTestId('section-mars');
    expect(within(marsSection).getAllByText(/Mars Science Laboratory/i).length).toBeGreaterThan(0);
    expect(within(marsSection).getAllByText(/Perseverance/i).length).toBeGreaterThan(0);
    expect(within(marsSection).getAllByText(/Curiosity/i).length).toBeGreaterThan(0);
    expect(within(marsSection).getByText(/Jezero Crater/i)).toBeInTheDocument();
    expect(within(marsSection).getByText(/Gale Crater/i)).toBeInTheDocument();
  });

  it('renders tactical 2D fallback for celestial visual when WebGL is unavailable in JSDOM', () => {
    render(<PlanetVisual destinationId="mars" name="Mars" type="TERRESTRIAL_PLANET" />);

    expect(screen.getByTestId('planet-visual-mars')).toBeInTheDocument();
    expect(screen.getByTestId('planet-fallback-mars')).toBeInTheDocument();
  });

  it('opens DedicatedImageryDrawer, clicks image card to open ImageDetailModal, and displays scientific metadata', async () => {
    render(<SpaceImageryView onReturnHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('explore-imagery-mars')).toBeInTheDocument();
    });

    // Open dedicated imagery drawer for Mars
    const exploreMarsBtn = screen.getByTestId('explore-imagery-mars');
    fireEvent.click(exploreMarsBtn);

    await waitFor(() => {
      expect(screen.getByTestId('imagery-drawer')).toBeInTheDocument();
      expect(screen.getAllByTestId('image-card-PIA25687').length).toBeGreaterThan(0);
    });

    const card = screen.getAllByTestId('image-card-PIA25687')[0];
    fireEvent.click(card);

    // Modal appears
    const modal = screen.getByTestId('image-detail-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Perseverance Self-Portrait at Belva Crater/i)).toBeInTheDocument();
    expect(within(modal).getByText(/NASA ID: PIA25687/i)).toBeInTheDocument();

    // Manifest resolutions loaded from API
    await waitFor(() => {
      expect(screen.getByTestId('resolution-links')).toBeInTheDocument();
    });
    expect(screen.getByText(/Original Raw Asset/i)).toBeInTheDocument();
    expect(screen.getByText(/4K Large/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByTestId('close-detail-modal');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('image-detail-modal')).not.toBeInTheDocument();
  });

  it('executes global archive search and displays results in overlay drawer', async () => {
    render(<SpaceImageryView onReturnHome={vi.fn()} />);

    const searchInput = screen.getByTestId('search-archive-input');
    const searchBtn = screen.getByTestId('search-archive-button');

    fireEvent.change(searchInput, { target: { value: 'Jupiter Europa' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(imageryApi.searchImagery).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Jupiter Europa' })
      );
      expect(screen.getByTestId('search-results-panel')).toBeInTheDocument();
    });

    expect(screen.getByText(/Query: "Jupiter Europa"/i)).toBeInTheDocument();
  });

  it('handles destination loading failure with retry button', async () => {
    vi.spyOn(imageryApi, 'getPlanetaryDestinations').mockRejectedValueOnce(
      new Error('NASA Gateway Connection Timeout')
    );

    render(<SpaceImageryView onReturnHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('destinations-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/NASA Gateway Connection Timeout/i)).toBeInTheDocument();

    // Clicking retry attempts to reload
    vi.spyOn(imageryApi, 'getPlanetaryDestinations').mockResolvedValueOnce(MOCK_DESTINATIONS);
    const retryBtn = within(screen.getByTestId('destinations-error')).getByRole('button', { name: /Retry Connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('destinations-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('solar-system-navigator')).toBeInTheDocument();
    });
  });

  it('renders rover showcase instrument tags and triggers rover search', () => {
    const handleSearch = vi.fn();
    render(
      <RoverShowcase
        rovers={MOCK_DESTINATIONS[2].activeRovers}
        onSearchRover={handleSearch}
      />
    );

    expect(screen.getByTestId('rover-card-Perseverance')).toBeInTheDocument();
    expect(screen.getByText('Mastcam-Z')).toBeInTheDocument();
    expect(screen.getByText('MOXIE')).toBeInTheDocument();

    const roverSearchBtns = screen.getAllByRole('button', { name: /Search imagery from/i });
    fireEvent.click(roverSearchBtns[0]);
    expect(handleSearch).toHaveBeenCalledWith('Perseverance Jezero');
  });
});
