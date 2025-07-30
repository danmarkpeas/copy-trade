"use client"
import Link from "next/link";

const brokers = [
  { name: "Binance", logo: "/globe.svg" },
  { name: "Bybit", logo: "/globe.svg" },
  { name: "OKX", logo: "/globe.svg" },
  { name: "Kraken", logo: "/globe.svg" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fa] dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-6 px-6 md:px-12">
        <div className="flex items-center gap-2">
          <img src="/globe.svg" alt="CopyTrade Logo" className="w-8 h-8 rounded bg-neutral-100 dark:bg-neutral-800 p-1" />
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">CopyTrade</span>
        </div>
        <nav className="hidden md:flex gap-8 text-zinc-600 dark:text-zinc-300 font-medium text-base">
          <Link href="#about" className="hover:text-black dark:hover:text-white transition">About</Link>
          <Link href="#traders" className="hover:text-black dark:hover:text-white transition">For Traders</Link>
          <Link href="#followers" className="hover:text-black dark:hover:text-white transition">For Followers</Link>
          <Link href="#blog" className="hover:text-black dark:hover:text-white transition">Blog</Link>
        </nav>
        <Link href="/login" className="bg-white shadow px-6 py-2 rounded-full font-semibold text-zinc-800 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 transition">Sign Up</Link>
      </header>
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="max-w-2xl w-full flex flex-col items-center mt-8 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-4">Connect. Copy. Grow.</h1>
          <p className="text-lg md:text-xl text-center text-zinc-600 dark:text-zinc-300 mb-6">
            CopyTrade lets you follow top traders, automate your portfolio, and grow your wealth with ease.
          </p>
        </div>
        {/* Feature Cards */}
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl justify-center">
          {/* Portfolio Card */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 flex flex-col items-start min-w-[260px]">
            <div className="text-sm text-zinc-500 mb-2">Your portfolio</div>
            <div className="text-3xl font-bold text-green-600 mb-1">$12,450.00</div>
            <div className="text-xs text-zinc-400 mb-4">Last 30 days</div>
            <div className="w-full h-16 flex items-end">
              {/* Placeholder for chart */}
              <svg width="100%" height="60" viewBox="0 0 160 60"><polyline fill="none" stroke="#22c55e" strokeWidth="3" points="0,50 30,40 60,45 90,30 120,20 160,10" /></svg>
            </div>
          </div>
          {/* Connect Brokers Card */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 flex flex-col items-center min-w-[260px]">
            <div className="text-sm text-zinc-500 mb-4">Connect brokers</div>
            <div className="flex gap-4 mb-4">
              {brokers.map(broker => (
                <div key={broker.name} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow">
                  <img src={broker.logo} alt={broker.name} className="w-6 h-6" />
                </div>
              ))}
            </div>
            <Link href="/login" className="mt-2 bg-black text-white font-medium px-5 py-2 rounded-full shadow hover:bg-zinc-800 transition">Get Started</Link>
          </div>
          {/* Insights Card */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 flex flex-col min-w-[260px]">
            <div className="text-sm text-zinc-500 mb-2">Insights & performance</div>
            <div className="text-base text-zinc-700 dark:text-zinc-200 mb-2">“Your portfolio outperformed 85% of followers this month.”</div>
            <div className="text-xs text-zinc-400 mb-4">Get tips and analytics to improve your results.</div>
            <div className="w-full h-10 flex items-end">
              {/* Placeholder for mini chart or stat */}
              <svg width="100%" height="40" viewBox="0 0 120 40"><polyline fill="none" stroke="#818cf8" strokeWidth="2" points="0,35 20,30 40,32 60,20 80,15 120,10" /></svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
