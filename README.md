# ShoreSquad 🏖️

**Rally your crew, track weather, and hit the next beach cleanup with our dope map app!**

## Overview

ShoreSquad is a social network designed to mobilize young people for beach cleanup events. Using weather tracking, interactive maps, and social features, we make environmental action fun, connected, and easy to plan.

## Features

- 🗺️ **Interactive Maps** - Find cleanup events near you with Leaflet-powered maps
- 🌤️ **Weather Integration** - Check beach conditions before your cleanup
- 👥 **Social Crew System** - Rally your friends and track group progress
- 📱 **Mobile-First Design** - Optimized for beach use with large touch targets
- 🔄 **Progressive Web App** - Install on your device for offline access
- ♿ **Accessibility Focused** - WCAG compliant with screen reader support

## Quick Start

1. **Clone and Open**
   ```bash
   git clone <repository-url>
   cd ShoreSquad
   ```

2. **Install Live Server Extension** (VS Code)
   - Open VS Code
   - Install "Live Server" extension
   - Right-click `index.html` and select "Open with Live Server"

3. **Or use NPM**
   ```bash
   npm install
   npm start
   ```

## Project Structure

```
ShoreSquad/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles with CSS custom properties
├── js/
│   └── app.js          # Main JavaScript application
├── .vscode/
│   └── settings.json   # VS Code Live Server config
├── .gitignore          # Git ignore rules
├── package.json        # Project dependencies
└── README.md           # This file
```

## Technology Stack

- **Frontend**: HTML5, CSS3 (Custom Properties), Vanilla JavaScript
- **Maps**: Leaflet.js for interactive mapping
- **Weather**: OpenWeatherMap API integration ready
- **PWA**: Service Worker and Web App Manifest ready
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Responsive**: Mobile-first design with CSS Grid and Flexbox

## Color Palette

- **Primary Blue**: `#0077BE` - Ocean connection, trust
- **Secondary Beige**: `#F4E4BC` - Beach vibes, warmth  
- **Accent Coral**: `#FF6B6B` - Energy, call-to-action
- **Success Green**: `#20B2AA` - Environmental progress
- **Warning Orange**: `#FF8C42` - Weather alerts
- **Dark Navy**: `#1A365D` - Text, sophistication

## Development

### Adding New Features

1. **Events**: Extend the `appState.events` array in `js/app.js`
2. **Weather**: Add your OpenWeatherMap API key to `APP_CONFIG.WEATHER_API_KEY`
3. **Maps**: Customize map markers and popup content in `addSampleEvents()`
4. **Styling**: Use CSS custom properties in `:root` for consistent theming

### API Integration

Replace mock data in `js/app.js`:

```javascript
// Replace this mock weather data
const mockWeatherData = { ... };

// With actual API call
const response = await fetch(
    `${APP_CONFIG.WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${APP_CONFIG.WEATHER_API_KEY}&units=imperial`
);
```

### Accessibility Guidelines

- All interactive elements have `min-height: 44px` for touch targets
- Color contrast ratios meet WCAG AA standards  
- Screen reader compatible with ARIA labels
- Keyboard navigation support
- High contrast mode support via CSS media queries

## Deployment

### Static Hosting (Recommended)
- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect to GitHub repository
- **GitHub Pages**: Enable in repository settings

### Custom Domain Setup
1. Update `homepage` in `package.json`
2. Add CNAME file for custom domains
3. Update Open Graph meta tags in `index.html`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes following the code style
4. Test on mobile devices
5. Submit a pull request

## Future Enhancements

- [ ] User authentication and profiles
- [ ] Real-time chat for cleanup crews
- [ ] Gamification with badges and leaderboards
- [ ] Photo sharing from cleanup events
- [ ] Integration with waste tracking APIs
- [ ] Push notifications for nearby events
- [ ] Social media sharing capabilities
- [ ] Multi-language support

## License

MIT License - feel free to use this project as a starting point for your own environmental initiatives!

## Support

For questions or suggestions:
- 📧 Email: hello@shoresquad.app  
- 🐛 Issues: GitHub Issues tab
- 💬 Discussions: GitHub Discussions

---

**Let's make our shores cleaner, one cleanup at a time! 🌊**