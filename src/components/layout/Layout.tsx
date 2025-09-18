import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveNotifications from '../notifications/LiveNotifications'
// import ChristmasEvent from '../events/ChristmasEvent'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Layout shell for the app, rendering global chrome (Navbar, Footer),
 * live notifications, and the animated Aurora background.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative flex flex-col min-h-screen text-white">
      {/* Aurora background layer */}
      <div className="aurora">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
        <div className="noise-overlay" />
      </div>
      {/* <ChristmasEvent /> */}
      <LiveNotifications />
      <Navbar />
      <main className="flex-grow w-full px-4 lg:px-12 xl:px-24 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout