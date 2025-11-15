# 🚀 Quick Start Guide - Campus Lens

## ✅ What's Been Created

A complete React + Vite + Clerk frontend with:
- ✅ Authentication (Clerk integration)
- ✅ Photo upload with preview
- ✅ AI-powered tagging display
- ✅ Gallery with tag filtering
- ✅ Dashboard with stats
- ✅ Responsive design (Tailwind CSS)
- ✅ Protected routes
- ✅ API integration with JWT token
  

## 🔧 Setup Steps

### 1. Add Your Clerk Publishable Key

Edit `frontend/.env.local` and replace the placeholder:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
VITE_API_URL=http://localhost:8000
```

**Where to find your Clerk key:**
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to "API Keys"
4. Copy the "Publishable key" (starts with `pk_test_` or `pk_live_`)

### 2. Start the Backend (Terminal 1)

```powershell
# From project root
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend will be available at: http://localhost:8000

### 3. Start the Frontend (Terminal 2)

```powershell
# From project root
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

## 🎯 Test the Application

1. **Open browser**: http://localhost:5173
2. **Sign up**: Click "Sign Up" → Create account with Clerk
3. **Upload photo**: Go to Upload page → Select an image
4. **Wait for AI**: Backend will analyze with BLIP/CLIP models
5. **View gallery**: See your photo with AI-generated tags
6. **Filter**: Click tags to filter photos

## 📁 Project Structure

```
DBMS-project-main/
├── app/                    # Backend (FastAPI)
│   ├── api/
│   ├── db/
│   └── ml/                 # BLIP + CLIP models
├── frontend/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API client
│   │   └── styles/        # Tailwind CSS
│   ├── .env.local         # ⚠️ ADD YOUR CLERK KEY HERE
│   └── package.json
└── uploads/               # Photo storage
```

## 🔑 Environment Variables Needed

### Backend (`.env` in project root)
```env
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
CLERK_AUDIENCE=optional_audience
DATABASE_URL=mysql+pymysql://user:password@localhost/campus_lens
```

### Frontend (`frontend/.env.local`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_URL=http://localhost:8000
```

## 🐛 Troubleshooting

### "Missing Clerk Publishable Key"
- Check `frontend/.env.local` exists and has the key
- Restart the dev server: `Ctrl+C` then `npm run dev`

### Backend 403 Errors
- Ensure backend `.env` has correct `CLERK_JWKS_URL`
- Match Clerk keys between frontend (publishable) and backend (JWKS URL)
- Sign in to Clerk in the frontend

### Images don't load
- Check backend is running on port 8000
- Verify `uploads/` folder exists
- Check browser console for errors

### npm install fails
- Use Node 18+: `node --version`
- Delete `node_modules` and `package-lock.json`, retry

## 🎨 Features

### Pages
- **Home** (`/`) - Landing page with features
- **Sign In** (`/sign-in`) - Clerk authentication
- **Sign Up** (`/sign-up`) - Clerk registration
- **Dashboard** (`/dashboard`) - Overview + stats
- **Upload** (`/upload`) - Photo upload with AI tagging
- **Gallery** (`/gallery`) - Browse all photos with tag filters

### Components
- **Navbar** - Navigation with user menu
- **PhotoCard** - Single photo display with tags + delete
- **PhotoGrid** - Responsive gallery layout
- **TagFilter** - Search and filter by tags
- **ProtectedRoute** - Auth guard for private pages

## 🚀 Production Build

### Build Frontend
```powershell
cd frontend
npm run build
```

Creates optimized files in `frontend/dist/`

### Run Production
```powershell
# Start backend (serves frontend/dist automatically)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 - backend serves the React app!

## 📊 Data Flow

1. **User Signs In** → Clerk handles auth → JWT token stored
2. **Upload Photo** → POST with token → Backend validates → Saves file → ML models tag → Returns result
3. **View Gallery** → GET with token → Backend returns user's photos → Display with tags
4. **Filter by Tag** → Frontend filters locally or calls API
5. **Delete Photo** → DELETE with token → Backend validates ownership → Removes file + DB records

## 💡 Next Steps

- [ ] Configure Clerk webhooks to sync users to your database
- [ ] Add more ML models or custom tags
- [ ] Implement photo sharing/public links
- [ ] Add dark mode
- [ ] Deploy to production (Vercel, Netlify, etc.)

## 📚 Documentation

- Frontend README: `frontend/README.md`
- Backend API: http://localhost:8000/docs (when running)
- Clerk Docs: https://clerk.com/docs
- Vite Docs: https://vitejs.dev

## 🆘 Need Help?

Check the console logs:
- **Frontend**: Browser DevTools Console
- **Backend**: Terminal running uvicorn

Both will show detailed error messages.

---

**You're all set! 🎉**

Start both servers and open http://localhost:5173 to begin!
