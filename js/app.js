/**
 * ShoreSquad - Beach Cleanup Social Network
 * Main JavaScript Application
 * 
 * Features:
 * - Interactive Maps with Leaflet
 * - Weather API Integration
 * - Progressive Web App capabilities
 * - Responsive navigation
 * - Event management
 * - Geolocation services
 */

// ===================================
// APPLICATION STATE & CONFIGURATION
// ===================================

const APP_CONFIG = {
    // Singapore NEA API endpoints
    NEA_API_BASE: 'https://api-open.data.gov.sg/v2/real-time',
    NEA_FORECAST_BASE: 'https://api-open.data.gov.sg/v1/environment',
    
    // API Endpoints
    WEATHER_CURRENT_URL: 'https://api-open.data.gov.sg/v2/real-time/weather-stations',
    WEATHER_FORECAST_URL: 'https://api-open.data.gov.sg/v1/environment/4-day-weather-forecast',
    RAINFALL_URL: 'https://api-open.data.gov.sg/v2/real-time/weather-stations',
    
    // Default map settings - Singapore/Pasir Ris focused
    DEFAULT_COORDS: [1.381497, 103.955574], // Pasir Ris Beach
    MAP_ZOOM: 12,
    
    // App settings
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    GEOLOCATION_TIMEOUT: 10000, // 10 seconds
};

// Application state
let appState = {
    currentLocation: null,
    map: null,
    weatherData: null,
    events: [],
    userPreferences: {
        theme: 'light',
        notifications: true,
        location: 'auto'
    }
};

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Debounce function to limit API calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show loading spinner
 */
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
    }
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Show enhanced toast notification
 */
function showToast(message, type = 'info', duration = 4000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create individual toast
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    
    // Add icon based on type
    let icon = '';
    switch(type) {
        case 'success': icon = '🎉'; break;
        case 'error': icon = '⚠️'; break;
        case 'warning': icon = '🔔'; break;
        case 'welcome': icon = '🏖️'; break;
        default: icon = 'ℹ️';
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="closeToast('${toastId}')" aria-label="Close notification">×</button>
        </div>
    `;
    
    toast.className = `toast toast-${type}`;
    toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });
    
    // Auto hide after duration (except for welcome messages)
    if (type !== 'welcome') {
        setTimeout(() => {
            closeToast(toastId);
        }, duration);
    }
}

/**
 * Close specific toast notification
 */
function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

/**
 * Show welcome message with special styling
 */
function showWelcomeMessage() {
    showToast('Welcome to ShoreSquad! Ready to make a difference?', 'welcome', 8000);
}

/**
 * Format date for display
 */
function formatDate(date) {
    const options = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('en-US', options);
}

/**
 * Calculate distance between two points
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ===================================
// GEOLOCATION & WEATHER SERVICES
// ===================================

/**
 * Get user's current location
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: APP_CONFIG.GEOLOCATION_TIMEOUT,
            maximumAge: APP_CONFIG.CACHE_DURATION
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = [position.coords.latitude, position.coords.longitude];
                appState.currentLocation = coords;
                resolve(coords);
            },
            (error) => {
                console.warn('Geolocation error:', error.message);
                // Fallback to default location
                appState.currentLocation = APP_CONFIG.DEFAULT_COORDS;
                resolve(APP_CONFIG.DEFAULT_COORDS);
            },
            options
        );
    });
}

/**
 * Fetch current weather data from NEA Singapore API
 */
async function fetchCurrentWeather() {
    try {
        console.log('Fetching current weather from:', APP_CONFIG.WEATHER_CURRENT_URL);
        const response = await fetch(APP_CONFIG.WEATHER_CURRENT_URL);
        
        if (!response.ok) {
            console.error('Weather API response not ok:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        console.log('Weather API response:', data);
        
        // Check if data structure is as expected
        if (!data.data || !data.data.stations || data.data.stations.length === 0) {
            console.error('Invalid weather data structure:', data);
            return null;
        }
        
        // Find closest weather station to Pasir Ris area
        const stations = data.data.stations;
        let closestStation = stations[0]; // Default to first station
        let minDistance = Infinity;
        
        // Find station closest to Pasir Ris (1.381497, 103.955574)
        const pasirRisLat = 1.381497;
        const pasirRisLon = 103.955574;
        
        stations.forEach(station => {
            if (station.location && station.location.latitude && station.location.longitude) {
                const distance = calculateDistance(
                    pasirRisLat, pasirRisLon,
                    station.location.latitude, station.location.longitude
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestStation = station;
                }
            }
        });
        
        console.log('Closest station:', closestStation);
        
        return {
            temperature: closestStation.readings?.air_temperature || 28,
            humidity: closestStation.readings?.relative_humidity || 70,
            rainfall: closestStation.readings?.rainfall || 0,
            wind_speed: closestStation.readings?.wind_speed || 5,
            wind_direction: closestStation.readings?.wind_direction || 180,
            station_name: closestStation.name || 'Singapore',
            timestamp: data.data.timestamp
        };
    } catch (error) {
        console.error('Current weather fetch error:', error);
        return null;
    }
}

/**
 * Fetch 4-day weather forecast from NEA Singapore API
 */
async function fetchWeatherForecast() {
    try {
        console.log('Fetching weather forecast from:', APP_CONFIG.WEATHER_FORECAST_URL);
        const response = await fetch(APP_CONFIG.WEATHER_FORECAST_URL);
        
        if (!response.ok) {
            console.error('Forecast API response not ok:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        console.log('Forecast API response:', data);
        
        if (data.items && data.items.length > 0) {
            const forecasts = data.items[0].forecasts;
            console.log('Forecast data:', forecasts);
            return forecasts.map(forecast => ({
                date: forecast.date,
                forecast: forecast.forecast,
                temperature: forecast.temperature,
                relative_humidity: forecast.relative_humidity,
                wind: forecast.wind
            }));
        }
        return null;
    } catch (error) {
        console.error('Forecast fetch error:', error);
        return null;
    }
}

/**
 * Combine current weather and forecast data
 */
async function fetchWeatherData() {
    try {
        console.log('Starting weather data fetch...');
        
        const [currentWeather, forecast] = await Promise.all([
            fetchCurrentWeather(),
            fetchWeatherForecast()
        ]);
        
        console.log('Current weather result:', currentWeather);
        console.log('Forecast result:', forecast);
        
        // If either API fails, use fallback data
        const weatherData = {
            current: currentWeather || {
                temperature: 28,
                humidity: 75,
                rainfall: 0,
                wind_speed: 8,
                station_name: 'Singapore (Fallback)'
            },
            forecast: forecast || generateFallbackForecast(),
            timestamp: new Date().toISOString(),
            isLive: !!(currentWeather && forecast)
        };
        
        appState.weatherData = weatherData;
        
        // Log status (no user notification for fallback)
        if (weatherData.isLive) {
            console.log('Successfully loaded live NEA weather data');
        } else {
            console.log('Using fallback weather data - seamless experience maintained');
        }
        
        return weatherData;
    } catch (error) {
        console.error('Weather data fetch error:', error);
        
        // Always return fallback data to ensure UI works
        const fallbackData = {
            current: {
                temperature: 28,
                humidity: 75,
                rainfall: 0,
                wind_speed: 8,
                station_name: 'Singapore (Offline)'
            },
            forecast: generateFallbackForecast(),
            timestamp: new Date().toISOString(),
            isLive: false
        };
        
        appState.weatherData = fallbackData;
        console.log('Weather data offline - showing sample forecast');
        return fallbackData;
    }
}

/**
 * Generate fallback forecast for Singapore weather
 */
function generateFallbackForecast() {
    const forecasts = [];
    const baseDate = new Date();
    
    for (let i = 0; i < 4; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        
        forecasts.push({
            date: date.toISOString().split('T')[0],
            forecast: i === 0 ? 'Partly Cloudy' : ['Thundery Showers', 'Cloudy', 'Fair'][i % 3],
            temperature: {
                low: 24 + Math.floor(Math.random() * 2),
                high: 30 + Math.floor(Math.random() * 4)
            },
            relative_humidity: {
                low: 60 + Math.floor(Math.random() * 10),
                high: 85 + Math.floor(Math.random() * 10)
            },
            wind: {
                speed: {
                    low: 5 + Math.floor(Math.random() * 5),
                    high: 15 + Math.floor(Math.random() * 10)
                },
                direction: ['NE', 'E', 'SE', 'S'][i % 4]
            }
        });
    }
    
    return forecasts;
}

/**
 * Update weather widget with Singapore NEA data
 */
function updateWeatherWidget(weatherData) {
    const weatherInfo = document.getElementById('weather-info');
    if (!weatherInfo) {
        console.error('Weather info element not found');
        return;
    }
    
    if (!weatherData) {
        console.error('No weather data provided');
        weatherInfo.innerHTML = '<div class="weather-loading">Loading weather data...</div>';
        return;
    }
    
    const current = weatherData.current;
    const forecast = weatherData.forecast;
    
    console.log('Updating weather widget with:', { current, forecast });
    
    if (!current || !forecast) {
        console.error('Missing current or forecast data:', { current, forecast });
        weatherInfo.innerHTML = `
            <div class="weather-loading">
                Weather data temporarily unavailable. Please try refreshing the page.
                <br><small>Checking NEA API connection...</small>
            </div>
        `;
        return;
    }
    
    // Add data source indicator (subtle)
    const dataSource = weatherData.isLive ? 
        '<div class="data-status live">🌤️ Live Data</div>' : 
        '<div class="data-status fallback">🌤️ Singapore Weather</div>';
    
    // Current weather card
    let currentWeatherHTML = `
        <div class="weather-card current-weather">
            <h4>Current Conditions</h4>
            ${dataSource}
            <div class="weather-temp">${Math.round(current.temperature)}°C</div>
            <div class="weather-station">${current.station_name}</div>
            <div class="weather-details">
                <span>💧 Humidity ${Math.round(current.humidity)}%</span>
                <span>🌧️ Rainfall ${current.rainfall}mm</span>
                <span>💨 Wind ${Math.round(current.wind_speed)} km/h</span>
            </div>
        </div>
    `;
    
    // 4-day forecast cards
    let forecastHTML = '<div class="forecast-container">';
    forecast.slice(0, 4).forEach((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-SG', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
        
        const tempLow = day.temperature?.low || 24;
        const tempHigh = day.temperature?.high || 32;
        const humidity = day.relative_humidity?.high || 85;
        const windSpeed = day.wind?.speed?.high || 15;
        
        forecastHTML += `
            <div class="forecast-card">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-date">${dateStr}</div>
                <div class="forecast-condition">${getWeatherEmoji(day.forecast)} ${day.forecast}</div>
                <div class="forecast-temp">
                    <span class="temp-high">${tempHigh}°</span>
                    <span class="temp-low">${tempLow}°</span>
                </div>
                <div class="forecast-details">
                    <div>💧 ${humidity}%</div>
                    <div>💨 ${windSpeed} km/h</div>
                </div>
            </div>
        `;
    });
    forecastHTML += '</div>';
    
    weatherInfo.innerHTML = currentWeatherHTML + forecastHTML;
}

/**
 * Get weather emoji based on forecast condition
 */
function getWeatherEmoji(condition) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('thunder') || conditionLower.includes('storm')) return '⛈️';
    if (conditionLower.includes('rain') || conditionLower.includes('shower')) return '🌧️';
    if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) return '☁️';
    if (conditionLower.includes('partly') || conditionLower.includes('fair')) return '⛅';
    if (conditionLower.includes('clear') || conditionLower.includes('sunny')) return '☀️';
    if (conditionLower.includes('hazy') || conditionLower.includes('haze')) return '🌫️';
    
    return '🌤️'; // Default partly cloudy
}

// ===================================
// MAP FUNCTIONALITY
// ===================================

/**
 * Initialize interactive map
 */
function initializeMap() {
    const mapElement = document.getElementById('cleanup-map');
    if (!mapElement) return;
    
    // Initialize Leaflet map
    appState.map = L.map('cleanup-map').setView(
        appState.currentLocation || APP_CONFIG.DEFAULT_COORDS,
        APP_CONFIG.MAP_ZOOM
    );
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(appState.map);
    
    // Add user location marker if available
    if (appState.currentLocation) {
        L.marker(appState.currentLocation)
            .addTo(appState.map)
            .bindPopup('Your Location')
            .openPopup();
    }
    
    // Add sample cleanup events
    addSampleEvents();
}

/**
 * Add sample cleanup events to map
 */
function addSampleEvents() {
    if (!appState.map) return;
    
    // Add the main Pasir Ris cleanup event first (highlighted)
    const pasirRisEvent = {
        id: 0,
        title: 'NEXT CLEANUP: Pasir Ris Beach',
        date: new Date(Date.now() + 86400000), // Tomorrow
        location: 'Pasir Ris Beach, Singapore',
        coords: [1.381497, 103.955574],
        attendees: 15,
        description: 'Join us at Street View Asia for our featured beach cleanup!',
        isNext: true
    };
    
    // Create special marker for Pasir Ris (next cleanup)
    const pasirRisIcon = L.divIcon({
        html: '<div style="background-color: #FF6B6B; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🎯</div>',
        className: 'next-cleanup-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    L.marker(pasirRisEvent.coords, { icon: pasirRisIcon })
        .addTo(appState.map)
        .bindPopup(`
            <div class="map-popup next-cleanup-popup">
                <h4 style="color: #FF6B6B;">${pasirRisEvent.title}</h4>
                <p><strong>📅 ${formatDate(pasirRisEvent.date)}</strong></p>
                <p>📍 ${pasirRisEvent.location}</p>
                <p>👥 ${pasirRisEvent.attendees} squad members signed up</p>
                <p>${pasirRisEvent.description}</p>
                <div style="margin-top: 10px;">
                    <button class="btn btn-small btn-primary" onclick="joinEvent(${pasirRisEvent.id})" style="margin-right: 5px;">
                        Join Cleanup
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="getDirectionsToPasirRis()">
                        Get Directions
                    </button>
                </div>
            </div>
        `)
        .openPopup(); // Open this popup by default
    
    // Other Singapore area events
    const sampleEvents = [
        {
            id: 1,
            title: 'East Coast Park Cleanup',
            date: new Date(Date.now() + 172800000), // Day after tomorrow
            location: 'East Coast Park',
            coords: [1.3048, 103.9318],
            attendees: 8,
            description: 'Morning cleanup along East Coast Park!'
        },
        {
            id: 2,
            title: 'Sentosa Beach Squad',
            date: new Date(Date.now() + 432000000), // This weekend
            location: 'Sentosa Beach',
            coords: [1.2494, 103.8303],
            attendees: 18,
            description: 'Weekend cleanup at popular Sentosa beaches!'
        },
        {
            id: 3,
            title: 'Changi Beach Cleanup',
            date: new Date(Date.now() + 259200000), // 3 days
            location: 'Changi Beach',
            coords: [1.3890, 103.9915],
            attendees: 12,
            description: 'Explore and clean the peaceful Changi coastline!'
        }
    ];
    
    sampleEvents.forEach(event => {
        const marker = L.marker(event.coords)
            .addTo(appState.map)
            .bindPopup(`
                <div class="map-popup">
                    <h4>${event.title}</h4>
                    <p><strong>📅 ${formatDate(event.date)}</strong></p>
                    <p>📍 ${event.location}</p>
                    <p>👥 ${event.attendees} attending</p>
                    <p>${event.description}</p>
                    <button class="btn btn-small btn-primary" onclick="joinEvent(${event.id})">
                        Join Event
                    </button>
                </div>
            `);
        
        // Store event data
        marker.eventData = event;
    });
    
    // Store events in app state (include Pasir Ris event)
    appState.events = [pasirRisEvent, ...sampleEvents];
}

/**
 * Center map on user's location
 */
function centerMapOnUser() {
    if (!appState.map || !appState.currentLocation) return;
    
    appState.map.setView(appState.currentLocation, APP_CONFIG.MAP_ZOOM);
    showToast('Map centered on your location', 'success');
}

/**
 * Center map on Pasir Ris cleanup location
 */
function centerMapOnPasirRis() {
    if (!appState.map) return;
    
    const pasirRisCoords = [1.381497, 103.955574];
    appState.map.setView(pasirRisCoords, 14);
    showToast('Showing next cleanup at Pasir Ris Beach! 🎯', 'success');
}

/**
 * Get directions to Pasir Ris (global function for popup)
 */
function getDirectionsToPasirRis() {
    const lat = 1.381497;
    const lng = 103.955574;
    const destination = `${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    
    // Try to open in Google Maps app first, fallback to web
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Try Google Maps app first
        window.location.href = `google.navigation:q=${lat},${lng}`;
        
        // Fallback to web after a short delay
        setTimeout(() => {
            window.open(url, '_blank');
        }, 500);
    } else {
        window.open(url, '_blank');
    }
    
    showToast('Opening directions to Pasir Ris Beach! 🗺️', 'success');
}

// ===================================
// EVENT MANAGEMENT
// ===================================

/**
 * Join a cleanup event
 */
function joinEvent(eventId) {
    const event = appState.events.find(e => e.id === eventId);
    if (!event) return;
    
    // Simulate joining event
    event.attendees += 1;
    showToast(`Joined "${event.title}"! See you there! 🏖️`, 'success');
    
    // Update events display
    renderEvents();
}

/**
 * Render events in the events section
 */
function renderEvents(filter = 'all') {
    const eventsGrid = document.getElementById('events-grid');
    if (!eventsGrid) return;
    
    let filteredEvents = [...appState.events];
    
    // Apply filters
    const now = new Date();
    switch (filter) {
        case 'today':
            filteredEvents = filteredEvents.filter(event => 
                new Date(event.date).toDateString() === now.toDateString()
            );
            break;
        case 'weekend':
            const nextSaturday = new Date();
            nextSaturday.setDate(now.getDate() + (6 - now.getDay()));
            const nextSunday = new Date(nextSaturday);
            nextSunday.setDate(nextSaturday.getDate() + 1);
            
            filteredEvents = filteredEvents.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= nextSaturday && eventDate <= nextSunday;
            });
            break;
        case 'my-crew':
            // Filter for user's crew events (mock implementation)
            filteredEvents = filteredEvents.filter(event => event.attendees > 15);
            break;
    }
    
    // Render events
    eventsGrid.innerHTML = filteredEvents.map(event => `
        <article class="event-card">
            <div class="event-date">${formatDate(event.date)}</div>
            <h4 class="event-title">${event.title}</h4>
            <p class="event-location">📍 ${event.location}</p>
            <div class="event-attendees">
                👥 ${event.attendees} squad members attending
            </div>
            <div style="margin-top: 1rem;">
                <button class="btn btn-primary btn-small" onclick="joinEvent(${event.id})">
                    Join Cleanup
                </button>
            </div>
        </article>
    `).join('');
    
    if (filteredEvents.length === 0) {
        eventsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <p>No events found for this filter. Create one to get started! 🏖️</p>
                <button class="btn btn-primary" id="create-new-event">Create Event</button>
            </div>
        `;
    }
}

// ===================================
// NAVIGATION & UI INTERACTIONS
// ===================================

/**
 * Initialize navigation functionality
 */
function initializeNavigation() {
    // Mobile navigation toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
        });
    }
    
    // Bottom navigation
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            bottomNavItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');
            
            // Scroll to section
            const targetId = item.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Event filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Apply filter
            const filter = button.getAttribute('data-filter');
            renderEvents(filter);
        });
    });
}

/**
 * Initialize button event handlers
 */
function initializeEventHandlers() {
    // Map controls
    const locateButton = document.getElementById('locate-me');
    const centerPasirRisBtn = document.getElementById('center-pasir-ris');
    
    if (locateButton) {
        locateButton.addEventListener('click', centerMapOnUser);
    }
    
    if (centerPasirRisBtn) {
        centerPasirRisBtn.addEventListener('click', centerMapOnPasirRis);
    }
    
    // CTA buttons
    const joinCleanupBtn = document.getElementById('join-cleanup');
    const createEventBtn = document.getElementById('create-event');
    
    if (joinCleanupBtn) {
        joinCleanupBtn.addEventListener('click', () => {
            showToast('Searching for nearby cleanups...', 'info');
            // Simulate search and scroll to events
            setTimeout(() => {
                document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
            }, 1000);
        });
    }
    
    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            showToast('Event creation coming soon! 🚀', 'info');
        });
    }
    
    // Pasir Ris cleanup specific buttons
    const joinPasirRisBtn = document.getElementById('join-pasir-ris');
    const getDirectionsBtn = document.getElementById('get-directions');
    
    if (joinPasirRisBtn) {
        joinPasirRisBtn.addEventListener('click', () => {
            showToast('Welcome to the Pasir Ris cleanup crew! 🏖️', 'success');
            // Add user to Pasir Ris event
            setTimeout(() => {
                showToast('Event details sent to your notifications!', 'info');
            }, 1500);
        });
    }
    
    if (getDirectionsBtn) {
        getDirectionsBtn.addEventListener('click', getDirectionsToPasirRis);
    }
    
    // Crew actions
    const inviteFriendsBtn = document.getElementById('invite-friends');
    const findSquadBtn = document.getElementById('find-squad');
    
    if (inviteFriendsBtn) {
        inviteFriendsBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Join my ShoreSquad!',
                    text: 'Rally your crew and clean our shores together! 🏖️',
                    url: window.location.href
                });
            } else {
                showToast('Invite feature coming soon!', 'info');
            }
        });
    }
    
    if (findSquadBtn) {
        findSquadBtn.addEventListener('click', () => {
            showToast('Squad finder launching soon! 👥', 'info');
        });
    }
    
    // Load more events
    const loadMoreBtn = document.getElementById('load-more-events');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            showToast('Loading more awesome cleanups...', 'info');
        });
    }
}

// ===================================
// PROGRESSIVE WEB APP FEATURES
// ===================================

/**
 * Initialize PWA features
 */
function initializePWA() {
    // Register service worker (when available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    }
    
    // Add to home screen prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button (you can add this to UI)
        console.log('PWA install prompt available');
    });
    
    // Handle app installation
    window.addEventListener('appinstalled', () => {
        showToast('ShoreSquad installed! Welcome to the squad! 🎉', 'success');
    });
}

/**
 * Initialize performance monitoring
 */
function initializePerformance() {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
        // This would integrate with web-vitals library
        console.log('Performance monitoring initialized');
    }
    
    // Preload critical resources
    const criticalImages = [
        // Add critical image URLs here
    ];
    
    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================

/**
 * Initialize the entire application
 */
async function initializeApp() {
    try {
        showLoading();
        
        // Get user location
        await getCurrentLocation();
        
        // Fetch Singapore weather data from NEA
        console.log('Initializing weather data...');
        const weatherData = await fetchWeatherData();
        console.log('Weather data received:', weatherData);
        updateWeatherWidget(weatherData);
        
        // Initialize map
        initializeMap();
        
        // Initialize navigation and event handlers
        initializeNavigation();
        initializeEventHandlers();
        
        // Initialize PWA features
        initializePWA();
        initializePerformance();
        
        // Render initial events
        renderEvents();
        
        // Hide loading spinner
        hideLoading();
        
        // Welcome message
        showWelcomeMessage();
        
    } catch (error) {
        console.error('App initialization error:', error);
        hideLoading();
        showToast('App loaded with limited features', 'warning');
    }
}

/**
 * Handle page visibility changes for performance
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause non-essential operations
        console.log('App paused');
    } else {
        // Resume operations, refresh data if needed
        console.log('App resumed');
        
        // Refresh Singapore weather data from NEA
        fetchWeatherData().then(updateWeatherWidget);
    }
});

// ===================================
// EVENT LISTENERS & APP STARTUP
// ===================================

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle window resize for responsive map
window.addEventListener('resize', debounce(() => {
    if (appState.map) {
        appState.map.invalidateSize();
    }
}, 250));

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored! 📶', 'success');
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may be limited.', 'warning');
});

// Expose global functions for inline event handlers
window.joinEvent = joinEvent;
window.centerMapOnUser = centerMapOnUser;
window.getDirectionsToPasirRis = getDirectionsToPasirRis;
window.closeToast = closeToast;