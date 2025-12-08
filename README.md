# AQI Reporting App

A simple Air Quality Index (AQI) reporting application that displays real-time air quality data for any city.

## Features

- **Current AQI**: Real-time air quality index for the specified city
- **Daily Average**: Average AQI over the current day
- **Color Coding**: International standard color coding (US EPA scale)
- **Pollutant Components**: Detailed breakdown of PM2.5, PM10, O₃, NO₂, SO₂, and CO levels
- **Data Storage**: SQLite database to track historical AQI data

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your API Key

You need to set your OpenWeatherMap API key as an environment variable. Here are the easiest ways:

#### Option A: Set in Current Terminal Session (Temporary)

**Windows PowerShell:**
```powershell
$env:OPENWEATHER_API_KEY="your_actual_api_key_here"
npm start
```

**Windows Command Prompt:**
```cmd
set OPENWEATHER_API_KEY=your_actual_api_key_here
npm start
```

**Note:** This only works for the current terminal session. You'll need to set it again if you close and reopen the terminal.

#### Option B: Set Permanently in Windows

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", click "New"
5. Variable name: `OPENWEATHER_API_KEY`
6. Variable value: `your_actual_api_key_here`
7. Click OK on all dialogs
8. **Restart your terminal/IDE** for changes to take effect

#### Option C: Create a `.env` file (Alternative)

1. Create a file named `.env` in the project root
2. Add this line: `OPENWEATHER_API_KEY=your_actual_api_key_here`
3. Install dotenv: `npm install dotenv`
4. The server will automatically load it

**Note**: The app will work with mock data if no API key is provided, but for real data, you need an API key.

### 3. Run the Application

```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Use the Application

1. Open your browser and navigate to `http://localhost:3000`
2. Enter a city name in the text box
3. Click "Check AQI" or press Enter
4. View the current AQI, daily average, and pollutant components

## AQI Color Coding

The app uses the US EPA AQI scale:

- **Green (0-50)**: Good
- **Yellow (51-100)**: Moderate
- **Orange (101-150)**: Unhealthy for Sensitive Groups
- **Red (151-200)**: Unhealthy
- **Purple (201-300)**: Very Unhealthy
- **Maroon (301+)**: Hazardous

## Project Structure

```
.
├── server.js          # Express backend server
├── database.js        # SQLite database functions
├── package.json       # Dependencies and scripts
├── aqi_data.db       # SQLite database (created automatically)
└── public/
    ├── index.html    # Frontend HTML
    └── app.js        # Frontend JavaScript
```

## Dependencies

- **express**: Web server framework
- **sqlite3**: SQLite database
- **axios**: HTTP client for API requests
- **cors**: Cross-origin resource sharing

## Notes

- The database file (`aqi_data.db`) will be created automatically on first run
- AQI data is stored in the database for calculating daily averages
- The app uses OpenWeatherMap's Air Pollution API for real-time data
- If no API key is provided, the app will use mock data for demonstration

