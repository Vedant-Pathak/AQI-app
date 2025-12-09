const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, saveAQIData, getDailyAverage } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

// API endpoint to get AQI for a city
app.get('/api/aqi/:city', async (req, res) => {
  try {
    const city = req.params.city;
    
    // Using OpenWeatherMap Air Pollution API
    // Note: You'll need to get a free API key from https://openweathermap.org/api
    // For now, using a demo approach - you can replace with actual API key
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE';
    
    // First, get coordinates for the city
    const geoResponse = await axios.get(`http://api.openweathermap.org/geo/1.0/direct`, {
      params: {
        q: city,
        limit: 1,
        appid: API_KEY
      }
    });

    if (!geoResponse.data || geoResponse.data.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { lat, lon } = geoResponse.data[0];

    // Get air pollution data
    const aqiResponse = await axios.get(`http://api.openweathermap.org/data/2.5/air_pollution`, {
      params: {
        lat: lat,
        lon: lon,
        appid: API_KEY
      }
    });

    const aqiData = aqiResponse.data.list[0];
    const currentAQI = aqiData.main.aqi; // 1-5 scale, we'll convert to 0-500
    const components = aqiData.components;

    // Convert OpenWeatherMap AQI (1-5) to US AQI (0-500) scale
    // This is a simplified conversion - for production, use proper conversion formulas
    const usAQI = convertToUSAQI(currentAQI, components);

    // Save to database
    await saveAQIData(city, usAQI, currentAQI, components);

    // Get daily average
    const dailyAverage = await getDailyAverage(city);

    // Calculate cigarette equivalents
    const pm25 = components.pm2_5 || 0;
    const cigarettesPerDay = calculateCigaretteEquivalent(pm25, 24);

    res.json({
      city: city,
      currentAQI: usAQI,
      openWeatherAQI: currentAQI,
      dailyAverage: dailyAverage,
      components: components,
      cigarettesPerDay: cigarettesPerDay,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching AQI:', error.message);
    
    // If API key is missing or invalid, return mock data for testing
    if (error.response?.status === 401 || API_KEY === 'YOUR_API_KEY_HERE') {
      const mockAQI = Math.floor(Math.random() * 300) + 50; // Random AQI between 50-350
      const mockDailyAvg = mockAQI + Math.floor(Math.random() * 50) - 25;
      
      await saveAQIData(city, mockAQI, 3, {
        co: 200,
        no: 10,
        no2: 20,
        o3: 50,
        pm2_5: 25,
        pm10: 40,
        so2: 5
      });
      
      const dailyAverage = await getDailyAverage(city);
      
      // Calculate cigarette equivalents for mock data
      const mockCigarettes = calculateCigaretteEquivalent(25, 24);
      
      return res.json({
        city: city,
        currentAQI: mockAQI,
        openWeatherAQI: 3,
        dailyAverage: dailyAverage || mockDailyAvg,
        components: {
          co: 200,
          no: 10,
          no2: 20,
          o3: 50,
          pm2_5: 25,
          pm10: 40,
          so2: 5
        },
        cigarettesPerDay: mockCigarettes,
        timestamp: new Date().toISOString(),
        note: 'Using mock data - please set OPENWEATHER_API_KEY environment variable'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch AQI data' });
  }
});

// Helper function to convert OpenWeatherMap AQI to US AQI scale
function convertToUSAQI(owmAQI, components) {
  // OpenWeatherMap uses 1-5 scale
  // We'll use PM2.5 and PM10 to calculate proper US AQI
  const pm25 = components.pm2_5 || 0;
  const pm10 = components.pm10 || 0;
  
  // US AQI calculation based on PM2.5 (most common)
  // Simplified formula - for production use proper EPA formulas
  if (pm25 <= 12) {
    return Math.round((pm25 / 12) * 50);
  } else if (pm25 <= 35.4) {
    return Math.round(50 + ((pm25 - 12) / 23.4) * 50);
  } else if (pm25 <= 55.4) {
    return Math.round(100 + ((pm25 - 35.4) / 20) * 50);
  } else if (pm25 <= 150.4) {
    return Math.round(150 + ((pm25 - 55.4) / 95) * 50);
  } else if (pm25 <= 250.4) {
    return Math.round(200 + ((pm25 - 150.4) / 100) * 100);
  } else {
    return Math.round(300 + ((pm25 - 250.4) / 149.6) * 200);
  }
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
  console.log('Note: Set OPENWEATHER_API_KEY environment variable for real data');
});

