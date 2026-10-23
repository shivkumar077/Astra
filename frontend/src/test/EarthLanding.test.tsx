import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { EarthCanvas } from '../components/earth/EarthCanvas';

describe('ASTRA Landing Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the core ASTRA product identity and classification', () => {
    render(<App />);

    // Brand and platform title
    expect(screen.getAllByText(/ASTRA/i)[0]).toBeInTheDocument();
    expect(
      screen.getByText(/Satellite Operations & Failure Simulation Platform/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ORBITAL SIMULATION PLATFORM \/\/ VER 0.1.0/i)
    ).toBeInTheDocument();
  });

  it('renders strictly two primary entry points: Mission Control and Space Imagery', () => {
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

    // Verify there are no competing tertiary entry cards
    const allEntryCards = entryContainer.querySelectorAll('.astra-entry-card');
    expect(allEntryCards.length).toBe(2);
  });

  it('opens and closes the informative briefing modal on entry point interaction', () => {
    render(<App />);

    // Initially modal is not open
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();

    // Click Mission Control
    const missionControlBtn = screen.getByTestId('entry-mission-control');
    fireEvent.click(missionControlBtn);

    // Modal opens with Phase 2 status
    const modal = screen.getByTestId('entry-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(/PRE-FLIGHT BRIEFING/i)).toBeInTheDocument();
    expect(screen.getByText(/ENGINEERING STAGE GATE: PHASE 2/i)).toBeInTheDocument();

    // Close via acknowledge button
    const ackButton = screen.getByRole('button', { name: /ACKNOWLEDGE & RETURN/i });
    fireEvent.click(ackButton);
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();

    // Click Space Imagery
    const spaceImageryBtn = screen.getByTestId('entry-space-imagery');
    fireEvent.click(spaceImageryBtn);

    expect(screen.getByTestId('entry-modal')).toBeInTheDocument();
    expect(screen.getByText(/ARCHIVE GATEWAY/i)).toBeInTheDocument();
    expect(screen.getByText(/ENGINEERING STAGE GATE: PHASE 5/i)).toBeInTheDocument();

    // Close via close icon button
    const closeBtn = screen.getByRole('button', { name: /Close modal dialog/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();
  });

  it('renders graceful tactical fallback when WebGL is unavailable in JSDOM', () => {
    // In our test setup, WebGL returns null in JSDOM
    render(<EarthCanvas />);

    const fallback = screen.getByTestId('earth-static-fallback');
    expect(fallback).toBeInTheDocument();
    expect(screen.getByText(/TACTICAL STATIC DISPLAY MODE/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Earth Sphere Synthesizer in 2D Precision Mode/i)
    ).toBeInTheDocument();
  });

  it('toggles reduced-motion mode via the header toggle', () => {
    render(<App />);

    const motionBtn = screen.getByRole('button', { name: /Enable reduced motion mode/i });
    expect(motionBtn).toBeInTheDocument();
    expect(screen.getByText(/MOTION: ACTIVE/i)).toBeInTheDocument();

    fireEvent.click(motionBtn);
    expect(screen.getByText(/MOTION: REDUCED/i)).toBeInTheDocument();
  });

  it('handles Escape key to dismiss the entry modal', () => {
    render(<App />);

    const missionControlBtn = screen.getByTestId('entry-mission-control');
    fireEvent.click(missionControlBtn);
    expect(screen.getByTestId('entry-modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('entry-modal')).not.toBeInTheDocument();
  });
});
