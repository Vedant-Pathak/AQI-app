// AQI color coding based on international standards (US EPA scale)
function getAQIColor(aqi) {
    if (aqi <= 50) return { bg: 'bg-green-500', text: 'text-white', label: 'Good', description: 'Air quality is satisfactory, and air pollution poses little or no risk.' };
    if (aqi <= 100) return { bg: 'bg-yellow-500', text: 'text-white', label: 'Moderate', description: 'Air quality is acceptable. However, there may be a risk for some people.' };
    if (aqi <= 150) return { bg: 'bg-orange-500', text: 'text-white', label: 'Unhealthy for Sensitive Groups', description: 'Members of sensitive groups may experience health effects.' };
    if (aqi <= 200) return { bg: 'bg-red-500', text: 'text-white', label: 'Unhealthy', description: 'Some members of the general public may experience health effects.' };
    if (aqi <= 300) return { bg: 'bg-purple-500', text: 'text-white', label: 'Very Unhealthy', description: 'Health alert: The risk of health effects is increased for everyone.' };
    return { bg: 'bg-red-800', text: 'text-white', label: 'Hazardous', description: 'Health warning of emergency conditions: everyone is more likely to be affected.' };
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return `Last updated: ${date.toLocaleString()}`;
}

// Update UI with AQI data
function updateUI(data) {
    // Hide loading and error
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    
    // Show results
    document.getElementById('results').classList.remove('hidden');
    
    // Update city name
    document.getElementById('cityName').textContent = data.city;
    
    // Update current AQI
    const currentAQI = data.currentAQI;
    const currentColor = getAQIColor(currentAQI);
    const currentCard = document.getElementById('currentAQICard');
    currentCard.className = `rounded-lg p-6 text-center shadow-md ${currentColor.bg} ${currentColor.text}`;
    document.getElementById('currentAQIValue').textContent = currentAQI;
    document.getElementById('currentAQILabel').textContent = currentColor.label;
    document.getElementById('currentAQIDescription').textContent = currentColor.description;
    
    // Update daily average
    const dailyAvg = data.dailyAverage || currentAQI;
    const dailyColor = getAQIColor(dailyAvg);
    const dailyCard = document.getElementById('dailyAvgCard');
    dailyCard.className = `rounded-lg p-6 text-center shadow-md ${dailyColor.bg} ${dailyColor.text}`;
    document.getElementById('dailyAvgValue').textContent = dailyAvg;
    document.getElementById('dailyAvgLabel').textContent = dailyColor.label;
    
    // Update components
    const components = data.components || {};
    document.getElementById('pm25').textContent = (components.pm2_5 || 0).toFixed(1);
    document.getElementById('pm10').textContent = (components.pm10 || 0).toFixed(1);
    document.getElementById('o3').textContent = (components.o3 || 0).toFixed(1);
    document.getElementById('no2').textContent = (components.no2 || 0).toFixed(1);
    document.getElementById('so2').textContent = (components.so2 || 0).toFixed(1);
    document.getElementById('co').textContent = (components.co || 0).toFixed(1);
    
    // Update timestamp
    document.getElementById('timestamp').textContent = formatTimestamp(data.timestamp);
}

// Show error message
function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
}

// Fetch AQI data
async function fetchAQI(city) {
    try {
        // Show loading
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('results').classList.add('hidden');
        
        const response = await fetch(`/api/aqi/${encodeURIComponent(city)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch AQI data');
        }
        
        updateUI(data);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred while fetching AQI data. Please try again.');
    }
}

// Form submission handler
document.getElementById('aqiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const city = document.getElementById('cityInput').value.trim();
    if (city) {
        fetchAQI(city);
    }
});

// Allow Enter key to submit
document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('aqiForm').dispatchEvent(new Event('submit'));
    }
});

