# jarzd.io - Multiplayer Flying Game

A 3D multiplayer flying and shooting game built with React, TypeScript, and Three.js.

## Project Structure

This consolidated version includes all necessary files in a single, organized structure:

```
/workspace/
├── src/
│   ├── components/
│   │   ├── UsernameScreen.tsx
│   │   ├── LobbyScreen.tsx
│   │   └── Game.tsx
│   ├── ui/
│   │   ├── button.tsx
│   │   └── input.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package-simple.json
├── vite-simple.config.ts
├── tsconfig-simple.json
├── tailwind.config.js
├── consolidated-app.tsx
└── index-complete.html
```

## Quick Start

### Option 1: Using the Complete HTML File

The easiest way to run the game is using `index-complete.html`:

1. Open `index-complete.html` in your browser
2. The game will load automatically with all dependencies included

### Option 2: Development Setup

1. Copy `package-simple.json` to `package.json`:
   ```bash
   cp package-simple.json package.json
   ```

2. Copy the config files:
   ```bash
   cp vite-simple.config.ts vite.config.ts
   cp tsconfig-simple.json tsconfig.json
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Game Features

### Core Gameplay
- **3D Flying Experience**: Pilot detailed aircraft with realistic physics
- **Multiple Game Modes**: Flying, parachuting, and ground movement
- **Combat System**: Shoot bullets while flying
- **Multiplayer Support**: Create and join game rooms

### Controls
- **Flying Mode**:
  - W/S or ↑/↓: Yaw (Turn left/right)
  - A/D or ←/→: Pitch (Up/Down)
  - Q/E: Roll
  - SPACE: Shoot
  - F: Jump out (deploy parachute)

- **Parachuting Mode**:
  - WASD/Arrows: Steer parachute

- **Ground Mode**:
  - WASD/Arrows: Move on ground

### Game Flow
1. **Username Entry**: Choose your pilot name
2. **Lobby**: Create a room or join with a code
3. **Game**: Fly, shoot, and interact with other players

## Technical Details

### Technologies Used
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Three.js**: 3D graphics and animations
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast development build tool
- **Lucide React**: Icon library

### Key Components

#### Game Engine
- Real-time 3D rendering with Three.js
- Physics simulation for aircraft movement
- Camera system with smooth following
- Particle effects and animations

#### Multiplayer Architecture
- Room-based multiplayer system
- Real-time player synchronization
- WebSocket communication (placeholder)
- Server integration ready (Supabase)

#### UI System
- Component-based React architecture
- Responsive design with Tailwind CSS
- Interactive HUD overlays
- Smooth transitions and animations

## Configuration

### Environment Setup
The game is configured to work with Supabase for backend services. Update the configuration in `src/components/LobbyScreen.tsx` and `src/components/Game.tsx`:

```typescript
const projectId = 'your-supabase-project-id';
const publicAnonKey = 'your-supabase-anon-key';
```

### Build Configuration
- **Vite**: Modern build tool with fast HMR
- **TypeScript**: Strict type checking
- **Tailwind**: CSS utility framework
- **PostCSS**: CSS processing

## Development

### Adding New Features
1. Create new components in `src/components/`
2. Add UI elements in `src/ui/`
3. Update styles in `src/index.css`
4. Configure in respective config files

### Customizing the Game
- **Aircraft Models**: Modify `createPlane()` function in `Game.tsx`
- **Controls**: Update keyboard event handlers
- **Game Rules**: Modify game logic in effect hooks
- **Visual Effects**: Adjust Three.js materials and lighting

## Production Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Static File Hosting
The `index-complete.html` file can be deployed to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3

## Troubleshooting

### Common Issues

1. **Three.js Not Loading**
   - Ensure all dependencies are installed
   - Check console for JavaScript errors
   - Verify `index-complete.html` loads correctly

2. **Game Controls Not Working**
   - Check if the game canvas has focus
   - Verify keyboard event listeners
   - Look for console errors

3. **Multiplayer Connection Issues**
   - Verify Supabase configuration
   - Check network connectivity
   - Ensure API endpoints are correct

### Performance Optimization
- Use `index-complete.html` for quick testing
- Enable production builds for deployment
- Monitor Three.js performance stats
- Optimize 3D model complexity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## License

This project is open source and available under the MIT License.

---

**Note**: This consolidated version is designed to work out-of-the-box. For production deployment, ensure you configure the backend services and update the environment variables accordingly.