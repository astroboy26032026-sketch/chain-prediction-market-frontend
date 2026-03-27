import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveNotifications from '../notifications/LiveNotifications'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Layout with fixed TOP navigation bar.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative flex flex-col min-h-screen text-white">
      {/* Aurora background */}
      <div className="aurora">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
        <div className="noise-overlay" />
      </div>

      <LiveNotifications />

      {/* Fixed TOP NAV */}
      <Navbar />

      {/* MAIN CONTENT (below top bar) */}
      <main className="flex-grow w-full pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  )
}

export default Layout
