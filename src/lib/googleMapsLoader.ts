const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';

const GOOGLE_MAPS_LOADER_LIBRARIES: ('places')[] = ['places'];

export const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY.length > 0;

export const googleMapsLoaderOptions = {
  id: 'rider-app-google-maps-loader',
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  libraries: GOOGLE_MAPS_LOADER_LIBRARIES,
  version: 'weekly' as const,
};

