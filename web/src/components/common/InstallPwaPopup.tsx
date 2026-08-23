'use client';
import React, { useEffect, useState } from 'react';

export default function InstallPwaPopup() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

  // If not ready and not iOS, don't show massive popup yet. 
  // Wait, user wants a massive popup blocking the view for farmers/sellers. 
  // We can just show a massive blocking overlay if they are on a mobile device and not standalone.
  
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
            className="bg-white text-blue-600 font-bold text-2xl py-4 px-8 rounded-full shadow-lg transform transition active:scale-95"
          >
            ⏬ DOWNLOAD APP NOW
          </button>
        ) : isIOS ? (
          <div className="bg-white/20 p-6 rounded-lg text-lg">
            <p>To install on iPhone:</p>
            <ol className="list-decimal text-left ml-6 mt-4 space-y-2">
              <li>Tap the <b>Share</b> button at the bottom of Safari.</li>
              <li>Scroll down and tap <b>"Add to Home Screen"</b>.</li>
            </ol>
          </div>
        ) : (
          <p className="text-lg animate-pulse">Checking device compatibility...</p>
        )}
      </div>
    );
  }

  return null;
}
