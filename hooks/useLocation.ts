import { useState, useEffect } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Mock location - San Francisco
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
        state: 'CA',
      });
    } catch (err) {
      setError('Failed to get location. Please enable location services.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return { location, isLoading, error, requestLocation };
}
