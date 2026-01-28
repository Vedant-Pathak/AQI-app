require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, saveAQIData, getDailyAverage } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// DEPRECATED: OpenWeather API key - kept for geocoding fallback only
// const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BING_MAPS_API_KEY = process.env.BING_MAPS_API_KEY;

// DEPRECATED: OpenWeather key check - no longer used for AQI
// const HAS_OPENWEATHER_KEY = Boolean(OPENWEATHER_API_KEY && OPENWEATHER_API_KEY !== 'YOUR_API_KEY_HERE' && OPENWEATHER_API_KEY !== 'your_key_here');
const HAS_GOOGLE_KEY = Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'your_key_here');
const HAS_BING_KEY = Boolean(BING_MAPS_API_KEY && BING_MAPS_API_KEY !== 'your_key_here');
const HAS_GEOCODING_KEY = HAS_GOOGLE_KEY || HAS_BING_KEY;

// Debug: log which keys are loaded at startup
console.log('API Keys loaded:');
console.log('  GOOGLE_MAPS_API_KEY:', HAS_GOOGLE_KEY ? 'set' : 'NOT SET');
console.log('  BING_MAPS_API_KEY:', HAS_BING_KEY ? 'set' : 'NOT SET');
console.log('  Note: Using Google Maps Air Quality API for AQI data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

const CITY_NAME_PATTERN = /^[\p{L}][\p{L} .'-]{1,79}$/u;
const GOOGLE_CITY_TYPES = new Set([
  'locality',
  'postal_town',
  'administrative_area_level_3',
  'administrative_area_level_2',
  'sublocality',
  'sublocality_level_1',
  'country' // For city-states like Singapore, Monaco, Vatican City
]);

function isPlausibleCityName(city) {
  if (!city) return false;
  const trimmed = city.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  return CITY_NAME_PATTERN.test(trimmed);
}

function isGoogleCityResult(result) {
  const types = result?.types || [];
  return types.some((type) => GOOGLE_CITY_TYPES.has(type));
}

async function geocodeWithGoogle(city) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: city,
      key: GOOGLE_MAPS_API_KEY
    }
  });

  if (response.data?.status !== 'OK' || !response.data.results?.length) {
    return null;
  }

  const result = response.data.results.find(isGoogleCityResult);
  if (!result) return null;

  return {
    lat: result.geometry.location.lat,
    lon: result.geometry.location.lng,
    formattedName: result.formatted_address,
    source: 'google'
  };
}

async function geocodeWithBing(city) {
  if (!BING_MAPS_API_KEY) return null;

  const response = await axios.get('https://dev.virtualearth.net/REST/v1/Locations', {
    params: {
      q: city,
      key: BING_MAPS_API_KEY,
      maxResults: 5
    }
  });

  const resources = response.data?.resourceSets?.[0]?.resources || [];
  const result = resources.find((resource) => resource.entityType === 'PopulatedPlace');
  if (!result) return null;

  return {
    lat: result.point?.coordinates?.[0],
    lon: result.point?.coordinates?.[1],
    formattedName: result.name,
    source: 'bing'
  };
}

// DEPRECATED: OpenWeather geocoding - removed in favor of Google/Bing
// async function geocodeWithOpenWeather(city) {
//   if (!HAS_OPENWEATHER_KEY) return null;
//
//   const response = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
//     params: {
//       q: city,
//       limit: 5,
//       appid: OPENWEATHER_API_KEY
//     }
//   });
//
//   if (!response.data || response.data.length === 0) {
//     return null;
//   }
//
//   const inputLower = city.toLowerCase().trim();
//   const result = response.data.find((r) => {
//     if (!r.country) return false;
//     const nameLower = (r.name || '').toLowerCase();
//     const localLower = (r.local_names?.en || r.name || '').toLowerCase();
//     return nameLower.includes(inputLower) || inputLower.includes(nameLower) ||
//            localLower.includes(inputLower) || inputLower.includes(localLower);
//   });
//
//   if (!result) {
//     console.log(`OpenWeather geocoding: no valid city match for "${city}"`);
//     return null;
//   }
//
//   return {
//     lat: result.lat,
//     lon: result.lon,
//     formattedName: `${result.name}, ${result.country}`,
//     source: 'openweather'
//   };
// }

async function geocodeCity(city) {
  return (
    (await geocodeWithGoogle(city)) ||
    (await geocodeWithBing(city))
  );
}

// API endpoint to get AQI for a city - Now using Google Maps Air Quality API
app.get('/api/aqi/:city', async (req, res) => {
  const city = req.params.city;

  try {
    if (!isPlausibleCityName(city)) {
      return res.status(400).json({
        error: 'Please enter a valid city name (letters, spaces, hyphens, apostrophes only).'
      });
    }
    
    if (!HAS_GOOGLE_KEY) {
      return res.status(500).json({
        error: 'Google Maps API key not found. Check your .env file and restart the server.'
      });
    }

    // Resolve coordinates with a geocoding provider (Google/Bing).
    const geoResult = await geocodeCity(city);
    if (!geoResult) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { lat, lon } = geoResult;
    const resolvedCityName = geoResult.formattedName || city;

    // Using Google Maps Air Quality API
    const aqiResponse = await axios.post(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_MAPS_API_KEY}`,
      {
        location: {
          latitude: lat,
          longitude: lon
        },
        extraComputations: [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO'
        ],
        languageCode: 'en'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const aqiData = aqiResponse.data;
    
    // Extract AQI values from Google response
    // Google provides multiple indexes - we'll use UAQI (Universal AQI) and US AQI if available
    const indexes = aqiData.indexes || [];
    const uaqiIndex = indexes.find(idx => idx.code === 'uaqi');
    const usAqiIndex = indexes.find(idx => idx.code === 'usa_epa');
    
    // Get the US AQI value, or convert from UAQI if not available
    const usAQI = usAqiIndex ? usAqiIndex.aqi : (uaqiIndex ? convertUAQItoUSAQI(uaqiIndex.aqi) : 0);
    const googleAQI = uaqiIndex ? uaqiIndex.aqi : usAQI;
    
    // Extract pollutant components from Google response
    const pollutants = aqiData.pollutants || [];
    const components = extractPollutantComponents(pollutants);

    // Save to database (using googleAQI as the raw value)
    await saveAQIData(resolvedCityName, usAQI, googleAQI, components);

    // Get daily average
    const dailyAverage = await getDailyAverage(resolvedCityName);

    // Calculate cigarette equivalents
    const pm25 = components.pm2_5 || 0;
    const cigarettesPerDay = calculateCigaretteEquivalent(pm25, 24);

    // Get health recommendations if available
    const healthRecommendations = aqiData.healthRecommendations || {};

    res.json({
      city: resolvedCityName,
      currentAQI: usAQI,
      googleAQI: googleAQI,
      aqiCategory: uaqiIndex?.category || usAqiIndex?.category || 'Unknown',
      dominantPollutant: aqiData.dominantPollutant || 'Unknown',
      dailyAverage: dailyAverage,
      components: components,
      cigarettesPerDay: cigarettesPerDay,
      healthRecommendations: healthRecommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching AQI:', error.message);
    
    if (error.response?.status === 400) {
      return res.status(400).json({
        error: 'Air quality data is not available for this location. The Google Air Quality API may not have coverage for this region.'
      });
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(404).json({ error: 'City not found' });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'City not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch AQI data: ' + error.message });
  }
});

// DEPRECATED: OpenWeatherMap AQI conversion function
// function convertToUSAQI(owmAQI, components) {
//   const pm25 = components.pm2_5 || 0;
//   const pm10 = components.pm10 || 0;
//   
//   if (pm25 <= 12) {
//     return Math.round((pm25 / 12) * 50);
//   } else if (pm25 <= 35.4) {
//     return Math.round(50 + ((pm25 - 12) / 23.4) * 50);
//   } else if (pm25 <= 55.4) {
//     return Math.round(100 + ((pm25 - 35.4) / 20) * 50);
//   } else if (pm25 <= 150.4) {
//     return Math.round(150 + ((pm25 - 55.4) / 95) * 50);
//   } else if (pm25 <= 250.4) {
//     return Math.round(200 + ((pm25 - 150.4) / 100) * 100);
//   } else {
//     return Math.round(300 + ((pm25 - 250.4) / 149.6) * 200);
//   }
// }

// Helper function to convert Google's UAQI (0-100 scale) to US AQI (0-500 scale)
// UAQI is a 0-100 scale where 100 is best, US AQI is 0-500 where 0 is best
function convertUAQItoUSAQI(uaqi) {
  // Google's UAQI: 100 = excellent, 0 = hazardous
  // US AQI: 0 = good, 500 = hazardous
  // This is an approximation - Google usually provides US AQI directly
  if (uaqi >= 80) return Math.round((100 - uaqi) * 2.5); // 0-50 (Good)
  if (uaqi >= 60) return Math.round(50 + (80 - uaqi) * 2.5); // 51-100 (Moderate)
  if (uaqi >= 40) return Math.round(100 + (60 - uaqi) * 2.5); // 101-150 (Unhealthy for Sensitive)
  if (uaqi >= 20) return Math.round(150 + (40 - uaqi) * 2.5); // 151-200 (Unhealthy)
  if (uaqi >= 10) return Math.round(200 + (20 - uaqi) * 10); // 201-300 (Very Unhealthy)
  return Math.round(300 + (10 - uaqi) * 20); // 301-500 (Hazardous)
}

// Helper function to extract pollutant components from Google Air Quality API response
function extractPollutantComponents(pollutants) {
  const components = {};
  
  for (const pollutant of pollutants) {
    const code = pollutant.code;
    const concentration = pollutant.concentration?.value || 0;
    
    // Map Google's pollutant codes to our component names
    switch (code) {
      case 'pm25':
        components.pm2_5 = concentration;
        break;
      case 'pm10':
        components.pm10 = concentration;
        break;
      case 'o3':
        components.o3 = concentration;
        break;
      case 'no2':
        components.no2 = concentration;
        break;
      case 'so2':
        components.so2 = concentration;
        break;
      case 'co':
        components.co = concentration;
        break;
      default:
        // Store any other pollutants with their original code
        components[code] = concentration;
    }
  }
  
  return components;
}

// Helper function to calculate cigarette equivalents
// Based on research: 22μg/m³ PM2.5 per 24 hours = 1 cigarette
// Formula: cigarettes per day = PM2.5 concentration / 22
function calculateCigaretteEquivalent(pm25, hoursExposed = 24) {
  if (!pm25 || pm25 <= 0) return 0;
  
  // 22μg/m³ per 24 hours = 1 cigarette
  // For different exposure times: (PM2.5 / 22) * (hours / 24)
  const cigarettes = (pm25 / 22) * (hoursExposed / 24);
  
  // Round to nearest integer (as per the reference calculator)
  return Math.round(cigarettes);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Note: Set GOOGLE_MAPS_API_KEY environment variable for AQI data (Air Quality API must be enabled)');
});

