# MEV Analytics Dashboard Frontend

A modern, responsive React + TypeScript application for the MEV Analytics Platform built with industry-standard tools and best practices.

## 🚀 Features

- **Modern Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **Component Library**: shadcn/ui with Radix UI primitives  
- **State Management**: Zustand for global state
- **Routing**: React Router v6 with role-based access control
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: Complete theme support with system preference detection
- **Role-Based UI**: Different layouts for validators, searchers, researchers, and admins
- **Authentication**: JWT and Solana wallet login support

## 🏗️ Architecture

### User Roles & Layouts
- **Validators**: Performance metrics, delegation analytics, MEV rewards
- **Searchers**: Live opportunities, profit simulations, bot generation
- **Researchers**: Historical data, market analysis, research tools
- **Admins**: Full access to all features

### Key Components
- `BaseLayout`: Main application layout with responsive sidebar
- `ProtectedRoute`: Route protection with role-based access
- `ThemeProvider`: Dark/light/system theme management
- `Sidebar`: Responsive navigation with mobile menu
- `Header`: User controls and theme toggle

### State Management
- `authStore`: User authentication and session management
- `themeStore`: Theme persistence and system integration

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
Runs on `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

## 🎨 Design System

### Colors
- Uses CSS custom properties for theme support
- Semantic color naming (primary, secondary, muted, etc.)
- Automatic dark/light mode adaptation

### Typography
- Inter font family for optimal readability
- Responsive font sizing with Tailwind utilities
- Proper heading hierarchy

### Components
- Built with shadcn/ui for consistency
- Accessible by default with Radix UI
- Customizable with Tailwind CSS

### Responsive Breakpoints
- Mobile-first design approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## 🔐 Authentication

### Supported Methods
1. **Email/Password**: Traditional authentication
2. **Solana Wallet**: Connect with Phantom, Solflare, etc.

### Role-Based Access
- Routes are protected based on user roles
- Sidebar navigation adapts to user permissions
- Unauthorized access redirects appropriately

## 📱 Mobile Experience

- Responsive sidebar with mobile hamburger menu
- Touch-friendly interface elements
- Optimized layouts for all screen sizes
- Progressive Web App ready

## 🎯 User Experience

### Performance
- Optimized bundle splitting
- Lazy loading for route components
- Efficient state management with Zustand

### Accessibility
- ARIA labels and semantic HTML
- Keyboard navigation support
- High contrast color ratios
- Screen reader friendly

### Theme System
- System preference detection
- Persistent theme storage
- Smooth theme transitions
- Theme toggle in header

## 🔧 Configuration

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Path Aliases
- `@/*` maps to `./src/*` for clean imports

## 📦 Dependencies

### Core
- React 18.2.0
- TypeScript 5.x
- Vite (latest)

### UI & Styling
- Tailwind CSS 3.x
- shadcn/ui components
- Radix UI primitives
- Lucide React icons

### State & Routing
- Zustand 4.4.7
- React Router DOM 6.20.1

### Utilities
- clsx & tailwind-merge for className handling
- class-variance-authority for component variants

## 🚦 Project Status

✅ **Complete**: Core React + TypeScript setup
✅ **Complete**: Tailwind CSS and shadcn/ui integration  
✅ **Complete**: React Router with role-based routing
✅ **Complete**: Zustand state management (auth & theme)
✅ **Complete**: Responsive layouts with dark/light mode
✅ **Complete**: Mobile-first responsive design

## 🎨 Screenshots

*Dashboard layouts adapt based on user role (validator/searcher/researcher) with role-specific navigation and metrics.*

## 📄 License

MIT License - see the project root for details.