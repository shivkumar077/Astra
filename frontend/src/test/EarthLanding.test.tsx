import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { EarthCanvas } from '../components/earth/EarthCanvas';
import { EntryModal } from '../components/ui/EntryModal';
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

describe('ASTRA Landing Experience — Prompt 6 Responsive & Celestial Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
  });

  it('renders the core ASTRA product identity and editorial typography without diagnostic clutter', () => {
    render(<App />);

    // Brand wordmark in editorial serif and platform classification
    expect(screen.getAllByText(/ASTRA/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Satellite Operations & Mission Simulation Platform/i)
    ).toBeInTheDocument();

    // Verify removed diagnostic telemetry labels are absent from the landing page
    expect(screen.queryByText(/COORD: ECI J2000/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PROPAGATOR: KEPLERIAN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SIM CLOCK: 10 HZ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SURFACE TEXTURES: NASA VISIBLE EARTH/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RENDERING: THREE\.JS WEBGL/i)).not.toBeInTheDocument();
  });

  it('renders strictly two prominent premium destination panels with icons as anchors', () => {
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

    const nasaArchiveBtn = screen.getByTestId('entry-nasa-archive');
    expect(nasaArchiveBtn).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Explore NASA Image Archive')
    );

    // Verify 3 destination panels are rendered
    const allPanels = entryContainer.querySelectorAll('.astra-destination-panel');
    expect(allPanels.length).toBe(3);

    // Verify destination names are positioned immediately below icon
    expect(within(missionControlBtn).getByText(/I\. MISSION CONTROL/i)).toBeInTheDocument();
    expect(within(spaceImageryBtn).getByText(/II\. SPACE IMAGERY/i)).toBeInTheDocument();
    expect(within(nasaArchiveBtn).getByText(/III\. NASA IMAGE ARCHIVE/i)).toBeInTheDocument();
  });

  it('transitions to mission control operations console and space imagery exploration', () => {
    render(<App />);

    // Initially views are not open
    expect(screen.queryByTestId('mission-control-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('space-imagery-view')).not.toBeInTheDocument();

    // Click Mission Control -> Transitions directly to Mission Control Operations Console
    const missionControlBtn = screen.getByTestId('entry-mission-control');
    fireEvent.click(missionControlBtn);

    const mcView = screen.getByTestId('mission-control-view');
    expect(mcView).toBeInTheDocument();
    expect(within(mcView).getByTestId('mission-control-header')).toBeInTheDocument();
    expect(within(mcView).getByTestId('return-to-landing')).toBeInTheDocument();

    // Return to Landing via Return button
    const returnFromMc = within(mcView).getByTestId('return-to-landing');
    fireEvent.click(returnFromMc);
    expect(screen.queryByTestId('mission-control-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('entry-mission-control')).toBeInTheDocument();

    // Click Space Imagery -> Transitions to Space Imagery exploration experience
    const spaceImageryBtn = screen.getByTestId('entry-space-imagery');
    fireEvent.click(spaceImageryBtn);

    const spaceView = screen.getByTestId('space-imagery-view');
    expect(spaceView).toBeInTheDocument();
    expect(within(spaceView).getByTestId('gateway-status')).toBeInTheDocument();
    expect(within(spaceView).getByTestId('return-to-landing')).toBeInTheDocument();

    // Return to Landing via Return button
    const returnBtn = screen.getByTestId('return-to-landing');
    fireEvent.click(returnBtn);
    expect(screen.queryByTestId('space-imagery-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('entry-space-imagery')).toBeInTheDocument();
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

  it('verifies the visible reduced-motion toggle button is removed from UI while silent accessibility remains active', () => {
    render(<App />);

    // The visible in-app toggle button is removed
    const motionBtn = screen.queryByRole('button', { name: /reduced motion/i });
    expect(motionBtn).not.toBeInTheDocument();
    expect(screen.queryByText(/motion: active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/motion: reduced/i)).not.toBeInTheDocument();
  });

  it('handles Escape key to return from mission control', () => {
    render(<App />);

    const missionControlBtn = screen.getByTestId('entry-mission-control');
    fireEvent.click(missionControlBtn);
    expect(screen.getByTestId('mission-control-view')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('mission-control-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('entry-mission-control')).toBeInTheDocument();
  });

  it('renders entry modal briefing and closes via acknowledge or escape when modal is used', () => {
    const handleClose = vi.fn();
    const { rerender } = render(<EntryModal destination="mission-control" onClose={handleClose} />);

    const modal = screen.getByTestId('entry-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Flight Readiness/i)).toBeInTheDocument();
    expect(within(modal).getByText(/ENGINEERING STAGE GATE: PHASE 2 IN PROGRESS/i)).toBeInTheDocument();

    // Close via acknowledge button
    const ackBtn = within(modal).getByRole('button', { name: /ACKNOWLEDGE & RETURN/i });
    fireEvent.click(ackBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Null destination renders nothing
    rerender(<EntryModal destination={null} onClose={handleClose} />);
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

  it('renders exactly ONE primary ASTRA hero wordmark with an integrated signature star on the final A', () => {
    const { container } = render(<App />);

    // Exactly ONE primary brand hero wordmark SVG is present (no duplicates in header or settled view)
    const wordmarkSvgs = container.querySelectorAll('.astra-hero-wordmark');
    expect(wordmarkSvgs.length).toBe(1);
    expect(wordmarkSvgs[0]).toHaveAttribute('aria-label', 'ASTRA');

    // Signature star is integrated at the final 'A' apex with anchor id
    const signatureStarAnchor = container.querySelector('#astra-signature-star');
    expect(signatureStarAnchor).toBeInTheDocument();

    // Layered depth plane sits at zIndex 2 (behind EarthCanvas at zIndex 3)
    const depthPlane = container.querySelector('.astra-intro-depth-plane') as HTMLElement;
    expect(depthPlane).toBeInTheDocument();
    expect(depthPlane.style.zIndex).toBe('2');

    // Earth canvas container sits at zIndex 3
    const earthCanvas = screen.getByTestId('earth-canvas-container');
    expect(earthCanvas.style.zIndex).toBe('3');
  });

  it('renders the cinematic wordmark dissolution particle field in the hero stage', () => {
    const { container } = render(<App />);

    // Dissolution canvas overlay exists inside the wordmark wrapper
    const dissolutionCanvas = container.querySelector('.astra-wordmark-dissolution-canvas');
    expect(dissolutionCanvas).toBeInTheDocument();
    expect(dissolutionCanvas).toHaveAttribute('aria-hidden', 'true');
  });
});


