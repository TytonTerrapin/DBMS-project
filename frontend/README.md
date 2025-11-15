# Campus Lens Frontend

Modern React + Vite frontend for the Campus Lens AI photo management application.

## Features

- 🔐 **Authentication**: Clerk integration for secure user auth
- 🤖 **AI-Powered**: Automatic photo tagging using BLIP and CLIP models
- 📸 **Photo Management**: Upload, view, filter, and delete photos
- 🏷️ **Smart Tags**: Filter photos by AI-generated tags
- 📱 **Responsive**: Mobile-friendly design with Tailwind CSS
- ⚡ **Fast**: Built with Vite for optimal performance

## Prerequisites

- Node.js 18+ and npm
- Clerk account with publishable key
- Backend API running on `http://localhost:8000`

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the frontend directory:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here
VITE_API_URL=http://localhost:8000
```

**Important**: Replace `pk_test_your_clerk_key_here` with your actual Clerk publishable key.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder that can be served by the backend.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── PhotoCard.jsx
│   │   ├── PhotoGrid.jsx
│   │   ├── TagFilter.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/           # Page components
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Gallery.jsx
│   │   └── Upload.jsx
│   ├── services/        # API client
│   │   └── api.js
│   ├── styles/          # Global styles
│   │   └── index.css
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Development Workflow

1. **Start the backend** (in project root):
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Start the frontend** (in frontend folder):
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

## API Integration

The frontend communicates with the backend via:

- **Proxy in dev**: Vite proxies `/api` and `/uploads` to `http://localhost:8000`
- **Authentication**: Uses Clerk JWT tokens sent as `Authorization: Bearer <token>` headers
- **Endpoints**:
  - `GET /api/users/me/photos` - Get user's photos
  - `POST /photos/upload` - Upload new photo
  - `DELETE /photos/:id` - Delete photo

## Authentication Flow

1. User signs in via Clerk
2. Clerk provides JWT token
3. Frontend attaches token to API requests
4. Backend validates token and returns user-specific data

## Styling

- **Framework**: Tailwind CSS
- **Components**: Custom components with Tailwind utility classes
- **Theme**: Primary color scheme defined in `tailwind.config.js`
- **Responsive**: Mobile-first design

## Troubleshooting

### "Missing Clerk Publishable Key" error
- Ensure `.env.local` exists and contains `VITE_CLERK_PUBLISHABLE_KEY`
- Restart the dev server after adding environment variables

### API requests fail with 403
- Check that backend is running on port 8000
- Ensure you're signed in to Clerk
- Verify backend has correct CLERK_JWKS_URL and other env vars

### Images don't display
- Verify backend is serving files from `/uploads/`
- Check browser console for 404 errors
- Ensure `file_path` in backend starts with `/uploads/`

## Deployment

### Production Build

```bash
npm run build
```

The `dist/` folder contains static files that the FastAPI backend will serve.

### Backend Integration

The backend (`app/main.py`) is configured to:
1. Serve static files from `frontend/dist/`
2. Handle SPA routing (serve `index.html` for client-side routes)
3. Keep `/api` and `/uploads` routes for API access

## Technologies

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Clerk** - Authentication
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling

## License

Part of the Campus Lens project.
