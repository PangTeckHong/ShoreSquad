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
    // API Keys (Replace with actual keys in production)
    WEATHER_API_KEY: 'your_openweather_api_key',
    MAPBOX_TOKEN: 'your_mapbox_token', // Optional for enhanced maps
    
    // API Endpoints
    WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Default map settings
    DEFAULT_COORDS: [40.7128, -74.0060], // NYC as fallback
    MAP_ZOOM: 10,
    
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
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
    // Create toast if it doesn't exist
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;
    
    // Auto hide after duration
    setTimeout(() => {
        toast.classList.remove('toast-show');
    }, duration);
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
    const R = 3959; // Earth's radius in miles
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
 * Fetch weather data for coordinates
 */
async function fetchWeatherData(lat, lon) {
    try {
        // In production, replace with actual API call
        // const response = await fetch(
        //     `${APP_CONFIG.WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${APP_CONFIG.WEATHER_API_KEY}&units=imperial`
        // );
        
        // Mock weather data for demo
        const mockWeatherData = {
            main: {
                temp: 72,
                feels_like: 75,
                humidity: 65
            },
            weather: [{
                main: 'Clear',
                description: 'Clear sky',
                icon: '01d'
            }],
            wind: {
                speed: 8.5,
                deg: 220
            },
            visibility: 10000,
            name: 'Beach Area'
        };
        
        appState.weatherData = mockWeatherData;
        return mockWeatherData;
    } catch (error) {
        console.error('Weather fetch error:', error);
        showToast('Could not load weather data', 'error');
        return null;
    }
}

/**
 * Update weather widget with current data
 */
function updateWeatherWidget(weatherData) {
    const weatherInfo = document.getElementById('weather-info');
    if (!weatherInfo || !weatherData) return;
    
    const { main, weather, wind } = weatherData;
    const condition = weather[0];
    
    weatherInfo.innerHTML = `
        <div class="weather-card">
            <div class="weather-temp">${Math.round(main.temp)}°F</div>
            <div class="weather-condition">${condition.description}</div>
            <div class="weather-details">
                <span>Feels like ${Math.round(main.feels_like)}°</span>
                <span>Humidity ${main.humidity}%</span>
                <span>Wind ${Math.round(wind.speed)} mph</span>
            </div>
        </div>
    `;
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
    
    const sampleEvents = [
        {
            id: 1,
            title: 'Sunset Beach Cleanup',
            date: new Date(Date.now() + 86400000), // Tomorrow
            location: 'Sunset Beach',
            coords: [40.7589, -73.9851],
            attendees: 12,
            description: 'Join us for a sunset cleanup session!'
        },
        {
            id: 2,
            title: 'Morning Shore Squad',
            date: new Date(Date.now() + 172800000), // Day after tomorrow
            location: 'Rockaway Beach',
            coords: [40.5892, -73.8162],
            attendees: 8,
            description: 'Early morning beach cleanup with breakfast after!'
        },
        {
            id: 3,
            title: 'Weekend Warriors',
            date: new Date(Date.now() + 432000000), // This weekend
            location: 'Coney Island',
            coords: [40.5755, -73.9707],
            attendees: 25,
            description: 'Big weekend cleanup event - all welcome!'
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
    
    // Store events in app state
    appState.events = sampleEvents;
}

/**
 * Center map on user's location
 */
function centerMapOnUser() {
    if (!appState.map || !appState.currentLocation) return;
    
    appState.map.setView(appState.currentLocation, APP_CONFIG.MAP_ZOOM);
    showToast('Map centered on your location', 'success');
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
    if (locateButton) {
        locateButton.addEventListener('click', centerMapOnUser);
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
        
        // Fetch weather data
        if (appState.currentLocation) {
            const [lat, lon] = appState.currentLocation;
            const weatherData = await fetchWeatherData(lat, lon);
            updateWeatherWidget(weatherData);
        }
        
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
        showToast('Welcome to ShoreSquad! 🏖️ Ready to make a difference?', 'success');
        
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
        
        // Refresh weather data if it's been a while
        if (appState.weatherData && appState.currentLocation) {
            const [lat, lon] = appState.currentLocation;
            fetchWeatherData(lat, lon).then(updateWeatherWidget);
        }
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