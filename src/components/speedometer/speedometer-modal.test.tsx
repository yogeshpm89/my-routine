import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SpeedometerModal } from './speedometer-modal';

describe('SpeedometerModal Component GPS Detection & Error Handling', () => {
  let watchPositionMock: any;
  let clearWatchMock: any;
  let successCallback: ((pos: any) => void) | null = null;
  let errorCallback: ((err: any) => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    successCallback = null;
    errorCallback = null;
    watchPositionMock = vi.fn((success, error, options) => {
      successCallback = success;
      errorCallback = error;
      return 101;
    });
    clearWatchMock = vi.fn();

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders acquiring GPS state with placeholder "--" when modal opens', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    // Should request watchPosition with 20s timeout and 2s maximumAge
    expect(watchPositionMock).toHaveBeenCalledTimes(1);
    expect(watchPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 2000,
      })
    );

    // Initial state should show acquiring and "--" speed
    expect(screen.getByText('Acquiring GPS...')).toBeInTheDocument();
    expect(screen.getByText('Acquiring GPS signal...')).toBeInTheDocument();
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('--');
  });

  it('updates to locked state and formatted speed when GPS fix is acquired', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    act(() => {
      successCallback?.({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          speed: 10, // 10 m/s = 36 km/h
          heading: 90,
          altitude: 15,
          accuracy: 5,
        },
        timestamp: Date.now(),
      });
    });

    expect(screen.getByText(/GPS Locked/)).toBeInTheDocument();
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('36.0');
  });

  it('prominently displays "GPS signal not available" and "--" when GPS error occurs', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    act(() => {
      errorCallback?.({
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    // Check for "--" placeholder instead of fabricated 0.0
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('--');

    // Check for prominent "GPS signal not available" badge and banner
    const unavailableNotices = screen.getAllByText('GPS signal not available');
    expect(unavailableNotices.length).toBeGreaterThanOrEqual(2);

    expect(
      screen.getByText('Ensure device location is enabled and you have a clear sky view.')
    ).toBeInTheDocument();

    // Verify retry button exists
    const retryBtn = screen.getByRole('button', { name: /Retry GPS/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it('restarts GPS acquisition when "Retry GPS" is clicked', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    act(() => {
      errorCallback?.({
        code: 3, // TIMEOUT
        message: 'Timed out',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('--');
    expect(clearWatchMock).not.toHaveBeenCalled();

    const retryBtn = screen.getByRole('button', { name: /Retry GPS/i });
    act(() => {
      fireEvent.click(retryBtn);
    });

    // Old watch should be cleared and new watch started
    expect(clearWatchMock).toHaveBeenCalledWith(101);
    expect(watchPositionMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Acquiring GPS...')).toBeInTheDocument();
  });

  it('distinguishes permission denied from signal unavailable', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    act(() => {
      errorCallback?.({
        code: 1, // PERMISSION_DENIED
        message: 'User denied Geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('--');
    expect(screen.getByText('Permission Denied')).toBeInTheDocument();
    expect(screen.getAllByText('Location Permission Denied').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Allow location access in your device or browser settings.')
    ).toBeInTheDocument();
  });

  it('marks signal unavailable when GPS fix goes stale for over 5 seconds', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    // Initial fix
    act(() => {
      successCallback?.({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          speed: 15,
          heading: 0,
          altitude: 0,
          accuracy: 5,
        },
        timestamp: Date.now(),
      });
    });

    expect(screen.getByText(/GPS Locked/)).toBeInTheDocument();
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('54.0'); // 15 m/s * 3.6 = 54 km/h

    // Fast-forward 6 seconds without new GPS fixes (e.g. entered tunnel or loss of satellites)
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Speed should revert to "--" and prominent notice shown
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('--');
    const unavailableNotices = screen.getAllByText('GPS signal not available');
    expect(unavailableNotices.length).toBeGreaterThanOrEqual(1);
  });

  it('supports interactive demo mode and cleanly returns to GPS mode on exit', () => {
    render(<SpeedometerModal isOpen={true} onClose={() => {}} />);

    const demoBtn = screen.getByRole('button', { name: /Test Drive \/ Demo/i });
    act(() => {
      fireEvent.click(demoBtn);
    });

    expect(screen.getByText('Interactive Demo')).toBeInTheDocument();
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('42.0');

    // Exit demo mode
    const exitDemoBtn = screen.getByRole('button', { name: /Exit Demo/i });
    act(() => {
      fireEvent.click(exitDemoBtn);
    });

    // Returns to GPS mode with placeholder "--"
    expect(screen.getByTestId('speedometer-digital-readout')).toHaveTextContent('--');
    expect(screen.getByText('Acquiring GPS...')).toBeInTheDocument();
  });
});
