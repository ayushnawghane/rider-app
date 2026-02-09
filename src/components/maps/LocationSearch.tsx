/**
 * LocationSearch Component
 * Search input with Google Places autocomplete for location selection
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, MapPin, X, Navigation } from 'lucide-react';
import { mapsService } from '../../services';
import { Location } from '../../types/maps';

interface LocationSearchProps {
  placeholder?: string;
  value?: string;
  onLocationSelect: (location: Location) => void;
  onClear?: () => void;
  icon?: 'pickup' | 'drop' | 'default';
  className?: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  placeholder = 'Search location...',
  value = '',
  onLocationSelect,
  onClear,
  icon = 'default',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getIconColor = () => {
    switch (icon) {
      case 'pickup':
        return 'text-primary-600 bg-primary-100';
      case 'drop':
        return 'text-success-600 bg-success-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  const getIconComponent = () => {
    switch (icon) {
      case 'pickup':
        return MapPin;
      case 'drop':
        return Navigation;
      default:
        return Search;
    }
  };

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }

    // Check if Google Maps is loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.error('Google Maps not loaded');
      return;
    }

    setIsLoading(true);
    try {
      const results = await mapsService.getPlacePredictions(input);
      setPredictions(results);
      setShowPredictions(true);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
    setIsLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  const handlePredictionSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    setIsLoading(true);
    setShowPredictions(false);

    const location = await mapsService.getPlaceDetails(prediction.place_id);
    if (location) {
      setInputValue(location.address);
      onLocationSelect(location);
    }

    setIsLoading(false);
  };

  const handleClear = () => {
    setInputValue('');
    setPredictions([]);
    setShowPredictions(false);
    onClear?.();
  };

  const IconComponent = getIconComponent();
  const [mapsError, setMapsError] = useState(false);

  // Check if Google Maps is available
  React.useEffect(() => {
    if (typeof window !== 'undefined' && (!window.google || !window.google.maps)) {
      setMapsError(true);
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {mapsError && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠️ Maps not loaded. Please refresh the page.
        </div>
      )}
      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor()}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 2 && setShowPredictions(true)}
          placeholder={placeholder}
          className="w-full input pl-14 pr-10 py-4 text-base"
          disabled={mapsError}
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Predictions Dropdown */}
      {showPredictions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-strong border border-gray-100 max-h-64 overflow-y-auto z-50">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handlePredictionSelect(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-3"
            >
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-strong p-4 z-50">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showPredictions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPredictions(false)}
        />
      )}
    </div>
  );
};

export default LocationSearch;
