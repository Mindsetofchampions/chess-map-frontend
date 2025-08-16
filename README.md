# CHESS Map Frontend

A modern React-based frontend plugin for the CHESS Map application, featuring glassmorphic UI design and interactive Mapbox integration. This plugin provides an intuitive interface for exploring virtual quests and safe spaces through an immersive mapping experience.

## 🌟 Features

- **Interactive Mapbox Integration**: Custom map styles with quest markers and safe space indicators
- **Glassmorphic UI Design**: Modern, translucent interface elements with backdrop blur effects
- **Real-time Data**: Integration with Supabase for dynamic quest and location data
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **TypeScript Support**: Full type safety and enhanced developer experience
- **Development Environment**: Concurrent API and frontend development setup

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Mapbox account for map tokens
- Supabase project for backend services

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd chess-map-frontend
   npm install
   ```

2. **Configure environment variables** (REQUIRED):
   ```bash
   cp .env.example .env
   ```
   
   **IMPORTANT:** You must fill in the actual values in `.env` before running the development server:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `VITE_MAPBOX_TOKEN`: Optional - your Mapbox token (map will show bubbles only without this)

3. **Get your credentials and update** `.env`:
   - Get your Mapbox token from [Mapbox Studio](https://studio.mapbox.com/)
   - Configure your Supabase project at [Supabase Console](https://app.supabase.com/)
   - Update the `.env` file with your actual values

4. **Start development environment**:
   ```bash
   npm run dev
   ```

This single command will start both the API server and frontend development server concurrently.

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox public access token | `pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV...` |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Custom Mapbox style URL | `mapbox://styles/username/style_id` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://yourproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Getting Your Tokens

#### Mapbox Setup
1. Visit [Mapbox Studio](https://studio.mapbox.com/)
2. Create an account or sign in
3. Go to **Account** → **Access Tokens**
4. Copy your **Default Public Token** or create a new one
5. (Optional) Create a custom map style and copy its style URL

#### Supabase Setup
1. Visit [Supabase Console](https://app.supabase.com/)
2. Create a new project or select existing one
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **Anon/Public Key**

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both API and frontend in development mode |
| `npm run start:api` | Start only the Bolt API server |
| `npm run start:frontend` | Start only the Vite frontend server |
| `npm run build` | Build the project for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint for code quality checks |

## 🏗️ Project Structure

```
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── GlassmorphismCard.tsx    # Reusable glassmorphic UI component
│   │   └── MapView.tsx                   # Main Mapbox integration component
│   ├── App.tsx                           # Root application component
│   ├── main.tsx                          # Application entry point
│   └── index.css                         # Global styles with Tailwind
├── public/
│   └── index.html                        # HTML template
├── bolt.toml                             # Bolt plugin configuration
├── vite.config.ts                        # Vite build configuration
├── tailwind.config.js                    # Tailwind CSS configuration
├── tsconfig.json                         # TypeScript configuration
└── package.json                          # Project dependencies and scripts
```

## 🎨 UI Components

### GlassmorphismCard
A reusable component that applies modern glassmorphic styling:
- Semi-transparent background with blur effects
- Subtle borders and shadows
- Responsive design
- TypeScript support

```tsx
import GlassmorphismCard from './components/ui/GlassmorphismCard';

<GlassmorphismCard>
  <h2>Your Content Here</h2>
</GlassmorphismCard>
```

### MapView
Interactive Mapbox component with:
- Custom map styles
- Quest marker placeholders
- Error handling and loading states
- Environment variable configuration
- TypeScript integration

## 🔗 API Integration

The frontend communicates with the Bolt API through proxy endpoints configured in `vite.config.ts`:

- `/map-token` - Mapbox token management
- `/quests` - Quest data and locations
- `/safe-spaces` - Safe space markers
- `/attributes` - Map attributes and metadata

## 🛠️ Development

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Tailwind CSS for styling
- React functional components with hooks

### Build Process
- Vite for fast development and optimized builds
- PostCSS for advanced CSS processing
- Automatic code splitting and optimization
- Source maps for debugging

## 📱 Responsive Design

The application is built with a mobile-first approach:
- Responsive breakpoints using Tailwind CSS
- Touch-friendly interface elements
- Optimized map interactions for mobile devices
- Adaptive UI components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the CHESS Map ecosystem. Please refer to the main project license for terms and conditions.

## 🆘 Troubleshooting

### Common Issues

**Map not loading:**
- Verify your `NEXT_PUBLIC_MAPBOX_TOKEN` is correct
- Check browser console for API errors
- Ensure your Mapbox token has the necessary scopes

**API connection errors:**
- Confirm both API and frontend servers are running
- Check proxy configuration in `vite.config.ts`
- Verify environment variables are properly set

**Build failures:**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors with `npm run lint`
- Verify all environment variables are defined

### Getting Help

- Check the browser developer console for detailed error messages
- Review the Mapbox and Supabase documentation for API-specific issues
- Ensure all environment variables match the required format

## 🔄 Updates

To update the project dependencies:

```bash
npm update
```

To check for outdated packages:

```bash
npm outdated
```

## 🧪 Testing Infrastructure

This project includes comprehensive testing infrastructure for maintaining code quality and preventing regressions.

### Jest Snapshot Testing

**Purpose**: Catch unintended changes in component rendering and structure.

```bash
# Run all tests
npm test

# Run tests in watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Update snapshots when changes are intentional
npm test -- --updateSnapshot
```

**Test Structure**:
```
src/
├── __tests__/
│   ├── FloatingBubbles.test.tsx    # CHESS attribute bubbles
│   ├── BubbleMarker.test.tsx       # Interactive map markers
│   ├── QuestPopup.test.tsx         # Quest modal functionality
│   └── GlassContainer.test.tsx     # Glassmorphic containers
└── __mocks__/
    └── framer-motion.ts            # Mock animations for testing
```

### Storybook Visual Testing

**Purpose**: Document components, test visual variations, and catch visual regressions.

```bash
# Start Storybook development server
npm run storybook

# Build Storybook for production
npm run build-storybook

# Run Chromatic visual regression tests (requires setup)
npm run chromatic
```

**Story Structure**:
```
src/stories/
├── Hero.stories.tsx              # Landing page hero section
├── FeatureCards.stories.tsx      # Feature highlight cards
├── MapView.stories.tsx           # Interactive map placeholder
└── FloatingBubbles.stories.tsx   # CHESS attribute animations
```

### Visual Regression Testing with Chromatic

**Setup**:
1. Create account at [chromatic.com](https://chromatic.com)
2. Install Chromatic in your project (already installed)
3. Get your project token from Chromatic dashboard
4. Set environment variable: `export CHROMATIC_PROJECT_TOKEN=your_token_here`

```bash
# Set your Chromatic token (required for visual regression testing)
export CHROMATIC_PROJECT_TOKEN=your_actual_token_here

# Run visual regression tests
npm run chromatic

# Build and test without publishing
npm run chromatic -- --dry-run
```

### Testing Best Practices

**Snapshot Testing Guidelines**:
- Update snapshots only when changes are intentional
- Review snapshot diffs carefully during code reviews
- Keep snapshots focused on component structure, not implementation details
- Use descriptive test names that explain what's being tested

**Storybook Guidelines**:
- Create stories for all component variations and states
- Include interaction testing for user flows
- Use accessibility addon to test WCAG compliance
- Document component props and usage patterns

**Visual Regression Guidelines**:
- Disable animations in visual regression stories for consistency
- Test across multiple viewport sizes
- Include both light and dark theme variations
- Review visual changes carefully before approving

### Continuous Integration

**Recommended CI Pipeline**:
```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test

- name: Type Check
  run: npm run type-check

- name: Lint Code
  run: npm run lint:check

- name: Visual Regression Tests
  run: npm run chromatic -- --exit-zero-on-changes
```

### Troubleshooting Tests

**Common Issues**:

1. **CSS Import Errors in Tests**: 
   ```bash
   # Verify __mocks__/styleMock.js exists for CSS mocking
   ```

2. **Chromatic Token Missing**:
   ```bash
   # Set environment variable before running chromatic
   export CHROMATIC_PROJECT_TOKEN=your_token_here
   npm run chromatic
   ```

1. **Snapshot Mismatches**: Usually caused by intentional changes
   ```bash
   npm test -- --updateSnapshot
   ```

2. **Framer Motion Errors**: Ensure mock is properly configured
   ```bash
   # Check src/__mocks__/framer-motion.ts exists
   ```

3. **Storybook Build Failures**: Check for TypeScript errors
   ```bash
   npm run type-check
   npm run lint:check
   ```

4. **Chromatic Upload Issues**: Verify token configuration
   ```bash
   # Check package.json chromatic script has correct token
   ```

### Testing Workflow

**Development Workflow**:
1. Write component code
2. Create comprehensive tests (`npm test`)
3. Document with Storybook stories (`npm run storybook`)
4. Run quality checks (`npm run quality`)
5. Submit for visual regression review (`npm run chromatic`)

**Code Review Workflow**:
1. Review test coverage and quality
2. Check Storybook documentation completeness
3. Approve or request changes on Chromatic visual diffs
4. Ensure all CI checks pass before merging