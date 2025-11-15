import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/home.css' // keep if you reuse any shared styles

const SLIDES = [
  {
    key: 'graduation',
    title: 'Graduation',
    desc: 'Caps in the air — celebrate achievements under twilight skies.',
    url: 'https://images.unsplash.com/photo-1462536943532-57a629f6cc60?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    link: 'https://unsplash.com/s/photos/university-graduation'
  },
  {
    key: 'fest',
    title: 'Campus Fest',
    desc: 'Evenings of lights and music — memories made with friends.',
    url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1600&auto=format&fit=crop',
    link: 'https://unsplash.com/'
  },
  {
    key: 'canteen',
    title: 'Canteen',
    desc: 'Laughter over lunch — the most peaceful corner on campus.',
    url: 'https://plus.unsplash.com/premium_photo-1663050786427-8d71c177946c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2FudGVlbnxlbnwwfHwwfHx8MA%3D%3D&fm=jpg&q=60&w=3000',
    link: 'https://unsplash.com/'
  },
  {
    key: 'library',
    title: 'Library',
    desc: 'Late-night study sessions — focus and quiet ambition.',
    url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1600&auto=format&fit=crop',
    link: 'https://unsplash.com/'
  }
]

export default function Home() {
  const [index, setIndex] = useState(1) // start on Campus Fest based on your screenshot

  const next = () => setIndex((i) => (i + 1) % SLIDES.length)
  const prev = () => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)

  const current = SLIDES[index]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-930 to-slate-900">
  {/* Corner glows (hidden on very small screens to avoid overflow) */}
  <div aria-hidden className="hidden sm:block pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-3xl" />
  <div aria-hidden className="hidden sm:block pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full bg-indigo-600/20 blur-3xl" />

      <main className="relative flex-1">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Hero header (unchanged) */}
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-100 mb-6">
              Welcome to <span className="text-cyan-400">Campus Lens</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              AI-powered photo management with automatic tagging using BLIP and CLIP models.
              Upload, organize, and discover your photos with intelligent search.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/sign-up" className="text-lg px-8 py-3 border border-white/10 bg-white/10 backdrop-blur hover:bg-cyan-500/20 text-slate-100 transition" style={{ borderRadius: 'var(--radius)' }}>
                Get Started
              </Link>
              <Link to="/sign-in" className="text-lg px-8 py-3 border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 text-slate-100 transition" style={{ borderRadius: 'var(--radius)' }}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Single-image carousel with Prev/Next */}
          <section className="mt-12 md:mt-16">
            <div className="mx-auto max-w-5xl">
              <div className="relative overflow-hidden" style={{ borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.15)), url('${current.url}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="aspect-[16/9] flex items-center">
                    <div className="px-8 md:px-12 max-w-xl">
                      <div className="text-4xl md:text-5xl font-extrabold text-white tracking-wide mb-4 uppercase drop-shadow-sm">
                        {current.title}
                      </div>
                      <p className="text-slate-100/90 text-lg md:text-xl mb-6 drop-shadow">
                        {current.desc}
                      </p>
                      <Link
                        to="/sign-in"
                        className="inline-flex items-center justify-center px-5 py-3 border border-white/10 bg-white/80 text-slate-900 hover:bg-white transition"
                        style={{ borderRadius: 'var(--radius)' }}
                      >
                        See More
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <button
                    onClick={prev}
                    className="h-10 w-10 border border-white/20 bg-black/30 text-white hover:bg-white/20 transition"
                    style={{ borderRadius: 'var(--radius)' }}
                    title="Previous"
                  >
                    ◁
                  </button>
                  <button
                    onClick={next}
                    className="h-10 w-10 border border-white/20 bg-black/30 text-white hover:bg-white/20 transition"
                    style={{ borderRadius: 'var(--radius)' }}
                    title="Next"
                  >
                    ▷
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="mt-20 grid md:grid-cols-3 gap-8">
            <div className="text-center bg-white/5 border border-white/10 p-6" style={{ borderRadius: 'var(--radius)' }}>
              <img src="https://www.wiz.ai/content/uploads/2025/09/Blog-images-scaled.jpg" alt="AI Tagging" className="mx-auto h-20 w-20 mb-4 object-cover rounded-full" />
              <h3 className="text-xl font-semibold text-slate-100 mb-2">AI-Powered Tagging</h3>
              <p className="text-slate-300">
                Automatic image analysis using state-of-the-art BLIP and CLIP models
              </p>
            </div>
            <div className="text-center bg-white/5 border border-white/10 p-6" style={{ borderRadius: 'var(--radius)' }}>
              <img src="https://img.freepik.com/premium-vector/smart-search-logo-icon-playful-logo-featuring-magnifying-glass-which-is-also-smart_695276-1142.jpg" alt="Smart Search" className="mx-auto h-20 w-20 mb-4 object-contain rounded-full" />
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Smart Search</h3>
              <p className="text-slate-300">
                Find photos instantly with intelligent tag-based filtering
              </p>
            </div>
            <div className="text-center bg-white/5 border border-white/10 p-6" style={{ borderRadius: 'var(--radius)' }}>
              <img src="https://blog.smartprint.com/hubfs/Imported_Blog_Media/secure-document-storage-digital-document-security-3.jpg" alt="Secure Storage" className="mx-auto h-20 w-20 mb-4 object-contain rounded-full" />
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Secure Storage</h3>
              <p className="text-slate-300">
                Your photos are safely stored and protected with authentication
              </p>
            </div>
          </section>

          {/* How it works */}
          <section className="mt-20 bg-white/5 border border-white/10 p-6 md:p-8 max-w-3xl mx-auto" style={{ borderRadius: 'var(--radius)' }}>
            <h2 className="text-3xl font-bold text-center text-slate-100 mb-8">How It Works</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-lg text-slate-100">Upload Photos</h4>
                  <p className="text-slate-300">Drag & drop images from your device or click Upload to add photos; files are uploaded to the server and processed for tagging.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-lg text-slate-100">Auto Tag & Caption</h4>
                  <p className="text-slate-300">Tags and captions are generated for fast discovery.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-lg text-slate-100">Browse & Share</h4>
                  <p className="text-slate-300">Explore your gallery with filters and a clean, accessible UI.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer (minimal) */}
      <footer className="mt-12 border-t border-white/10 bg-slate-950/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3">
                {/* Inline brand SVG (uses currentColor for easy theming) */}
                <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path
                    clipRule="evenodd"
                    d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
                    fill="currentColor"
                    fillRule="evenodd"
                  />
                </svg>
                <span className="text-xl font-bold text-slate-100">Campus Lens</span>
              </div>
              <p className="mt-3 text-slate-400">
                AI-powered campus photo galleries with intelligent tagging and search.
              </p>
            </div>
            <div>
              <h4 className="text-slate-200 font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/upload" className="hover:text-cyan-300">Upload</Link></li>
                <li><Link to="/dashboard" className="hover:text-cyan-300">Dashboard</Link></li>
                <li><Link to="/gallery" className="hover:text-cyan-300">Gallery</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-200 font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-cyan-300">Docs</a></li>
                <li><a href="#" className="hover:text-cyan-300">Status</a></li>
                <li><a href="#" className="hover:text-cyan-300">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-200 font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-cyan-300">Privacy</a></li>
                <li><a href="#" className="hover:text-cyan-300">Terms</a></li>
                <li><a href="#" className="hover:text-cyan-300">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-slate-500 text-sm">
            <span>© {new Date().getFullYear()} Campus Lens. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-cyan-300">Twitter</a>
              <a href="#" className="hover:text-cyan-300">LinkedIn</a>
              <a href="#" className="hover:text-cyan-300">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
