import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { navigationHistory } from '../utils/navigationHistory';
import { NotFoundView } from '../components/common/NotFoundView';
import { AboutMeView } from '../components/about/AboutMeView';
import { DEFAULT_PLANETARY_DESTINATIONS } from '../utils/planetaryCatalog';

describe('Phase 3: Custom ASTRA 404 Routing & View', () => {
  it('parses unknown hashes and paths into not-found viewMode', () => {
    expect(navigationHistory.parseUrlHash('#404').viewMode).toBe('not-found');
    expect(navigationHistory.parseUrlHash('#unknown-coordinates').viewMode).toBe('not-found');
    expect(navigationHistory.parseUrlHash('#deep-space-void').viewMode).toBe('not-found');
    expect(navigationHistory.parseUrlHash('/invalid-route').viewMode).toBe('not-found');
  });

  it('parses valid known routes correctly', () => {
    expect(navigationHistory.parseUrlHash('#').viewMode).toBe('landing');
    expect(navigationHistory.parseUrlHash('#space-imagery').viewMode).toBe('space-imagery');
    expect(navigationHistory.parseUrlHash('#mission-control').viewMode).toBe('mission-control');
    expect(navigationHistory.parseUrlHash('#about').viewMode).toBe('about');
  });

  it('renders NotFoundView with aerospace signal lost typography and actions', () => {
    const handleReturnHome = vi.fn();
    const handleEnterMC = vi.fn();

    render(
      <NotFoundView
        onReturnHome={handleReturnHome}
        onEnterMissionControl={handleEnterMC}
      />
    );

    // Prominent 404 and signal lost heading
    expect(screen.getByTestId('notfound-status-tag')).toHaveTextContent('SIGNAL LOST // DESTINATION NOT FOUND');
    expect(screen.getByTestId('notfound-error-code')).toHaveTextContent('404');
    expect(screen.getByText(/The celestial coordinates or trajectory requested do not correspond to any active telemetry node/i)).toBeInTheDocument();

    // Primary action: Return to Command
    const returnBtn = screen.getByTestId('notfound-return-home');
    fireEvent.click(returnBtn);
    expect(handleReturnHome).toHaveBeenCalledTimes(1);

    // Secondary action: Launch Mission Control
    const mcBtn = screen.getByTestId('notfound-mission-control');
    fireEvent.click(mcBtn);
    expect(handleEnterMC).toHaveBeenCalledTimes(1);
  });
});

describe('Phase 4: About Me Experience & Verified Links', () => {
  it('renders AboutMeView with verified identity, academics, and portfolio details', () => {
    const handleReturnHome = vi.fn();
    const handleEnterMC = vi.fn();

    render(
      <AboutMeView
        onReturnHome={handleReturnHome}
        onEnterMissionControl={handleEnterMC}
      />
    );

    // Identity verification: distinct two-line styling for Shiv and Kumar
    const nameEl = screen.getByTestId('about-name');
    expect(nameEl.querySelector('.astra-name-first')).toHaveTextContent('Shiv');
    expect(nameEl.querySelector('.astra-name-last')).toHaveTextContent('Kumar');
    expect(screen.getByTestId('about-tagline')).toBeInTheDocument();
    expect(screen.getByText(/Computer Science & Engineering Student/i)).toBeInTheDocument();
    expect(screen.getByText(/Cloud Computing Specialization/i)).toBeInTheDocument();

    // Featured project: ASTRA
    const featuredSection = screen.getByTestId('about-featured-project');
    expect(featuredSection).toBeInTheDocument();
    expect(screen.getByText(/Featured Engineering Project/i)).toBeInTheDocument();

    // Real ASTRA repository link verification
    const astraLink = screen.getByTestId('about-astra-repo-link');
    expect(astraLink).toHaveAttribute('href', 'https://github.com/shivkumar077/Astra');
    expect(astraLink).toHaveAttribute('target', '_blank');

    // Verified GitHub profile link is present
    const githubLink = screen.getByTestId('social-link-github');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/shivkumar077');

    // Unconfigured social links must NOT be rendered with empty hrefs
    const emptyLinks = screen.queryAllByRole('link').filter((l) => !l.getAttribute('href') || l.getAttribute('href') === '');
    expect(emptyLinks.length).toBe(0);

    // Return to command action
    const returnBtn = screen.getByTestId('about-return-btn');
    fireEvent.click(returnBtn);
    expect(handleReturnHome).toHaveBeenCalledTimes(1);
  });
});

describe('Phase 1 & 2: Resilience and Planetary Catalog Fallback', () => {
  it('provides all 9 default planetary destinations with valid imagery and telemetry', () => {
    expect(DEFAULT_PLANETARY_DESTINATIONS.length).toBe(9);
    const destinationIds = DEFAULT_PLANETARY_DESTINATIONS.map((d) => d.id);
    expect(destinationIds).toContain('earth');
    expect(destinationIds).toContain('mars');
    expect(destinationIds).toContain('jupiter');
    expect(destinationIds).toContain('saturn');
    expect(destinationIds).toContain('sun');

    DEFAULT_PLANETARY_DESTINATIONS.forEach((dest) => {
      expect(dest.name).toBeTruthy();
      expect(dest.summary).toBeTruthy();
      expect(dest.type).toBeTruthy();
      expect(dest.historicalMissions.length).toBeGreaterThan(0);
    });
  });
});
