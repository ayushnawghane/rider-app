import React, { useEffect, useState, useRef, useCallback } from 'react';
import { mapsService } from '../../services';
import { Location } from '../../types/maps';

interface LocationSearchProps {
  placeholder?: string;
  value?: string;
  onLocationSelect: (location: Location) => void;
  onClear?: () => void;
  icon?: 'pickup' | 'drop' | 'default';
}

type PlaceSuggestion =
  | google.maps.places.AutocompleteSuggestion
  | google.maps.places.AutocompletePrediction;

const LocationSearch: React.FC<LocationSearchProps> = ({
  placeholder = 'Search location...',
  value = '',
  onLocationSelect,
  onClear,
  icon = 'default',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Clean up the pending debounce timer and stop any late async callback from
  // updating state after the component unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const getIconConfig = () => {
    switch (icon) {
      case 'pickup':
        return { emoji: '📍', bgColor: '#FFEDD5', color: '#FF6B00' };
      case 'drop':
        return { emoji: '🏁', bgColor: '#FFF1CC', color: '#FFB300' };
      default:
        return { emoji: '🔍', bgColor: '#FFF1E0', color: '#FF6B00' };
    }
  };

  const iconConfig = getIconConfig();

  useEffect(() => {
    setInputValue(value);
    setPredictions([]);
    setShowPredictions(false);
  }, [value]);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }

    // Check if Google Maps is loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.error('Google Maps not loaded');
      setMapsError(true);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setMapsError(false);

    try {
      const results = await mapsService.getPlacePredictions(input);
      // Ignore results from a superseded keystroke or after unmount so the
      // dropdown never shows stale, out-of-order predictions.
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setPredictions(results);
      setShowPredictions(true);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setMapsError(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  const handlePredictionSelect = async (prediction: PlaceSuggestion) => {
    setIsLoading(true);
    setShowPredictions(false);

    try {
      const location = 'placePrediction' in prediction
        ? await mapsService.getPlaceDetailsFromSuggestion(prediction)
        : await mapsService.getPlaceDetails(prediction.place_id);
      if (location) {
        setInputValue(location.address);
        onLocationSelect(location);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }

    setIsLoading(false);
  };

  const handleClear = () => {
    setInputValue('');
    setPredictions([]);
    setShowPredictions(false);
    setMapsError(false);
    onClear?.();
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%'
  };

  const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%'
  };

  const iconContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: iconConfig.bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 48px 16px 64px',
    background: '#FFF7ED',
    borderRadius: '16px',
    border: mapsError ? '1px solid #FF3D00' : '1px solid rgba(0,0,0,0.08)',
    fontSize: '16px',
    fontWeight: 500,
    color: '#1A0E06',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const clearButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#9ca3af'
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    maxHeight: '280px',
    overflowY: 'auto',
    zIndex: 50,
    border: '1px solid #e5e7eb'
  };

  const predictionItemStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  };

  const loadingContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: '16px',
    zIndex: 50,
    border: '1px solid #e5e7eb'
  };

  const errorStyle: React.CSSProperties = {
    marginBottom: '8px',
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#dc2626'
  };

  const getSuggestionKey = (prediction: PlaceSuggestion, index: number) => {
    if ('placePrediction' in prediction) {
      return prediction.placePrediction?.placeId || `suggestion-${index}`;
    }
    return prediction.place_id || `prediction-${index}`;
  };

  const getSuggestionText = (prediction: PlaceSuggestion) => {
    if ('placePrediction' in prediction) {
      return {
        mainText: prediction.placePrediction?.mainText?.text || '',
        secondaryText: prediction.placePrediction?.secondaryText?.text || '',
      };
    }
    return {
      mainText: prediction.structured_formatting?.main_text || prediction.description || '',
      secondaryText: prediction.structured_formatting?.secondary_text || '',
    };
  };

  return (
    <div style={containerStyle}>
      {mapsError && (
        <div style={errorStyle}>
          ⚠️ Maps not loaded properly. Please refresh the page.
        </div>
      )}
      
      <div style={inputContainerStyle}>
        <div style={iconContainerStyle}>
          {iconConfig.emoji}
        </div>
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 2 && predictions.length > 0 && setShowPredictions(true)}
          placeholder={placeholder}
          style={inputStyle}
          disabled={mapsError}
        />
        
        {inputValue && (
          <button
            onClick={handleClear}
            style={clearButtonStyle}
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Predictions Dropdown */}
      {showPredictions && predictions.length > 0 && (
        <div style={dropdownStyle}>
          {predictions.map((prediction, index) => (
            (() => {
              const suggestionText = getSuggestionText(prediction);
              return (
            <button
              key={getSuggestionKey(prediction, index)}
              onClick={() => handlePredictionSelect(prediction)}
              style={{
                ...predictionItemStyle,
                borderBottom: index === predictions.length - 1 ? 'none' : '1px solid #f3f4f6'
              }}
              type="button"
            >
              <span style={{ fontSize: '18px', marginTop: '2px' }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                  margin: '0 0 2px 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {suggestionText.mainText}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {suggestionText.secondaryText}
                </p>
              </div>
            </button>
              );
            })()
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={loadingContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #FFE9A8',
              borderTopColor: '#FF6B00',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '14px' }}>Searching locations...</span>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Click outside overlay */}
      {showPredictions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40
          }}
          onClick={() => setShowPredictions(false)}
        />
      )}
    </div>
  );
};

export default LocationSearch;
