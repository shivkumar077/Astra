import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { EarthCanvas } from '../components/earth/EarthCanvas';
import {
  SignatureStar,
  TerrestrialPlanet,
  RingedPlanet,
  GasGiant,
  MoonCrater,
  Spacecraft,
  OrbitalTrajectory,
  OpticalAperture,
} from '../components/common/CelestialIcons';

describe('ASTRA Landing Experience — Prompt 3 Editorial Overhaul', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the core ASTRA product identity and editorial typography', () => {
    render(<App />);

    // Brand wordmark in editorial serif and platform classification
    expect(screen.getAllByText(/ASTRA/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Satellite Operations & Mission Simulation Platform/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ORBITAL PLATFORM \/\/ STAGE GATE 02/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AEROSPACE OPERATIONS \/\/ MISSION SIMULATION/i)
    ).toBeInTheDocument();
  });

  it('renders strictly two primary editorial entry points: Mission Control and Space Imagery', () => {
    render(<App />);

    const entryContainer = screen.getByTestId('primary-entry-points');
    expect(entryContainer).toBeInTheDocument();

    const missionControlBtn = screen.getByTestId('entry-mission-control');
    const spaceImageryBtn = screen.getByTestId('entry-space-imagery');

    expect(missionControlBtn).toBeInTheDocument();
    expect(spaceImageryBtn).toBeInTheDocument();

    // Verify accessible labels
    expect(missionControlBtn).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Enter Mission Control')
    );
    expect(spaceImageryBtn).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Explore Space Imagery')
    );

    // Verify exactly two destination rows are rendered, with no competing tertiary cards
    const allEntryRows = entryContainer.querySelectorAll('.astra-destination-row');
    expect(allEntryRows.length).toBe(2);
  });

  it('opens and closes the informative briefing modal on entry point interaction', () => {
    render(<App />);

    // Initially modal is not open
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();

    // Click Mission Control
    const missionControlBtn = screen.getByTestId('entry-mission-control');
    fireEvent.click(missionControlBtn);

    // Modal opens with Phase 2 status
    const mcModal = screen.getByTestId('entry-modal');
    expect(mcModal).toBeInTheDocument();
    expect(within(mcModal).getByText(/Flight Readiness/i)).toBeInTheDocument();
    expect(within(mcModal).getByText(/ENGINEERING STAGE GATE: PHASE 2 IN PROGRESS/i)).toBeInTheDocument();

    // Close via acknowledge button
    const ackButton = within(mcModal).getByRole('button', { name: /ACKNOWLEDGE & RETURN/i });
    fireEvent.click(ackButton);
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();

    // Click Space Imagery
    const spaceImageryBtn = screen.getByTestId('entry-space-imagery');
    fireEvent.click(spaceImageryBtn);

    const spaceModal = screen.getByTestId('entry-modal');
    expect(spaceModal).toBeInTheDocument();
    expect(within(spaceModal).getByText(/Astronomical Archives/i)).toBeInTheDocument();
    expect(within(spaceModal).getByText(/ENGINEERING STAGE GATE: PHASE 5 SCHEDULED/i)).toBeInTheDocument();

    // Close via close icon button
    const closeBtn = within(spaceModal).getByRole('button', { name: /Close modal dialog/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();
  });

  it('renders graceful tactical fallback when WebGL is unavailable in JSDOM', () => {
    render(<EarthCanvas />);

    const fallback = screen.getByTestId('earth-static-fallback');
    expect(fallback).toBeInTheDocument();
    expect(screen.getByText(/TACTICAL 2D DISPLAY MODE/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Planetary Visualization in Restrained 2D Precision/i)
    ).toBeInTheDocument();
  });

  it('toggles reduced-motion mode via the header toggle', () => {
    render(<App />);

    const motionBtn = screen.getByRole('button', { name: /Enable reduced motion mode/i });
    expect(motionBtn).toBeInTheDocument();
    expect(screen.getByText(/motion: active/i)).toBeInTheDocument();

    fireEvent.click(motionBtn);
    expect(screen.getByText(/motion: reduced/i)).toBeInTheDocument();
  });

  it('handles Escape key to dismiss the entry modal', () => {
    render(<App />);

    const missionControlBtn = screen.getByTestId('entry-mission-control');
    fireEvent.click(missionControlBtn);
    expect(screen.getByTestId('entry-modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();
  });

  it('renders the bespoke celestial icon family properly', () => {
    const { container } = render(
      <div>
        <SignatureStar size={24} />
        <TerrestrialPlanet size={24} />
        <RingedPlanet size={24} />
        <GasGiant size={24} />
        <MoonCrater size={24} />
        <Spacecraft size={24} />
        <OrbitalTrajectory size={24} />
        <OpticalAperture size={24} />
      </div>
    );

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(8);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
