'use client';
import React, { useEffect, useState } from 'react';

export default function InstallPwaPopup() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const [dismissed, setDismissed] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Prevent default mini-infobar
      setDeferredPrompt(e);
      setIsReady(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Timeout to show fallback if prompt never fires
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
      setDeferredPrompt(null);
      setIsReady(false);
    }
  };

  // If app is already installed/standalone, don't show
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }
  
  if (dismissed) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  if (!isStandalone && isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] bg-blue-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <h1 className="text-4xl font-bold mb-4">SEAVAIG AGRO</h1>
        <p className="text-xl mb-8">For security and performance, you must download our App to continue.</p>
        
        {isReady ? (
          <button 
            onClick={handleInstallClick}
            className="bg-white text-blue-600 font-bold text-2xl py-4 px-8 rounded-full shadow-lg transform transition active:scale-95 mb-6"
          >
            ⏬ DOWNLOAD APP NOW
          </button>
        ) : isIOS ? (
          <div className="bg-white/20 p-6 rounded-lg text-lg mb-6">
            <p>To install on iPhone:</p>
            <ol className="list-decimal text-left ml-6 mt-4 space-y-2">
              <li>Tap the <b>Share</b> button at the bottom of Safari.</li>
              <li>Scroll down and tap <b>"Add to Home Screen"</b>.</li>
            </ol>
          </div>
        ) : showFallback ? (
          <div className="bg-white/20 p-6 rounded-lg text-lg mb-6 max-w-sm">
            <p>To install manually:</p>
            <p className="mt-2 text-sm opacity-90">Tap the browser menu (3 dots) and select <b>"Install App"</b> or <b>"Add to Home screen"</b>.</p>
          </div>
        ) : (
          <p className="text-lg animate-pulse mb-6">Checking device compatibility...</p>
        )}

        <button 
          onClick={() => setDismissed(true)}
          className="text-white/70 underline mt-4 hover:text-white"
        >
          Go to Website (Link)
        </button>
      </div>
    );
  }

  return null;
}
