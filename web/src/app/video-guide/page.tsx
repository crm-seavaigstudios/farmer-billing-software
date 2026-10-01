"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  ChevronRight,
  Video,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  HelpCircle,
  FileSpreadsheet,
  Share2
} from 'lucide-react';

interface Scene {
  id: number;
  title: string;
  duration: number;
  subtitle: string;
  render: () => React.ReactNode;
}

export default function VideoGuidePage() {
  const { language } = useLanguage();
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.85);
  const [sceneTimer, setSceneTimer] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const SCENES: Scene[] = [
    {
      id: 1,
      title: "१. प्रस्तावना व ४-रोल सुरक्षित लॉगिन",
      duration: 14,
      subtitle: "सॉफ्टवेअरमध्ये मालक (Owner), कर्मचारी (Staff), शेतकरी (Farmer) आणि खरेदीदार व्यापारी (Seller) यांचे स्वतंत्र व १००% सुरक्षित लॉगिन दिले आहे.",
      render: () => (
        <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-black text-emerald-400 uppercase">🌾 Seavaig CRM सुरक्षित प्रवेश</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">256-Bit SSL</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-black text-center">
            <div className="bg-emerald-600 text-white py-1.5 rounded-lg shadow-xs">मालक (Owner)</div>
            <div className="text-slate-400 py-1.5">कर्मचारी</div>
            <div className="text-slate-400 py-1.5">शेतकरी</div>
            <div className="text-slate-400 py-1.5">व्यापारी</div>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-emerald-400">📱 ९८XXXXXXXX (मोबाईल नंबर)</div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-400">🔒 •••••••• (पासवर्ड)</div>
          </div>
          <button className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs shadow-lg">
            🔐 सुरक्षित लॉगिन करा
          </button>
        </div>
      )
    },
    {
      id: 2,
      title: "२. मालक डॅशबोर्ड व लाईव्ह आकडेवारी",
      duration: 15,
      subtitle: "डॅशबोर्डवर आजची एकूण खरेदी, विक्री, वसूल बाकी आणि नफ्याची थेट आकडेवारी एका नजरेत दिसते.",
      render: () => (
        <div className="w-full max-w-xl grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-slate-400">आजची खरेदी</span>
            <div className="text-lg font-black text-emerald-400">₹ १,८५,४००</div>
            <span className="text-xs text-emerald-500 font-bold">↑ १५ शेतकरी</span>
          </div>
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-slate-400">आजची विक्री</span>
            <div className="text-lg font-black text-blue-400">₹ २,४०,०००</div>
            <span className="text-xs text-blue-500 font-bold">३ गाड्या रवाना</span>
          </div>
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-slate-400">वसूल बाकी</span>
            <div className="text-lg font-black text-amber-400">₹ ८५,०००</div>
            <span className="text-xs text-amber-500 font-bold">बाजारातील येणे</span>
          </div>
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-slate-400">आजचा निव्वळ नफा</span>
            <div className="text-lg font-black text-purple-400">₹ १८,५००</div>
            <span className="text-xs text-purple-500 font-bold">७.७% मार्जिन</span>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "३. शेतकरी नोंदणी व दुहेरी ओळख कोड",
      duration: 14,
      subtitle: "प्रत्येक शेतकऱ्याला मोबाईल नंबरसोबत तुमच्या जुन्या वहीचा नंबर (Farmer Code उदा. F-102) जोडून २ सेकंदात शोधता येते.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-black text-emerald-400">
            <span>👨‍🌾 शेतकरी खाते नोंदणी</span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-xs">दुहेरी कोड सिस्टीम</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">स्थानिक नोंदवही कोड:</span>
              <span className="font-black text-amber-400 font-mono text-sm">F-102 (खाते क्र.)</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">शेतकऱ्याचे नाव:</span>
              <span className="font-black text-white text-sm">रमेश तुकाराम पाटील</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 font-bold">
            ✓ पावती बनवताना F-102 किंवा मोबाईल नंबर टाकल्यास शेतकरी लगेच लोड होतो.
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "४. मंडी खरेदी पावती व वजन कपात गणक",
      duration: 16,
      subtitle: "पिकाचा दर्जा (Grade A), एकूण वजन, गोणी बारदाना कपात आणि तोळा % कपात वजा करून अचूक निव्वळ बिल तयार होते.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-black text-white border-b border-slate-800 pb-2">
            <span>⚖️ खरेदी पावती क्र. #PB-8041</span>
            <span className="text-emerald-400 font-bold">डाळिंब (Grade A)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">एकूण वजन</span>
              <span className="font-black text-white">१,००० कि.ग्रा.</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-rose-400 block">कपात (गोणी+तोळा)</span>
              <span className="font-black text-rose-400">-५० कि.ग्रा.</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-emerald-400 block">निव्वळ वजन</span>
              <span className="font-black text-emerald-400">९५० कि.ग्रा.</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl">
            <span className="text-xs font-black text-white">निव्वळ देय रक्कम (Net Payable):</span>
            <span className="text-base font-black text-emerald-400">₹ ४७,५००</span>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "५. १-क्लिक ३६०° व्हॉट्सॲप बिल शेअरिंग",
      duration: 16,
      subtitle: "एका क्लिकवर शेतकऱ्याच्या व्हॉट्सॲपवर आजची पावती, एकूण खरेदी, आगाऊ उचल आणि शिल्लक बाकीचा संपूर्ण हिशोब जातो.",
      render: () => (
        <div className="w-full max-w-md bg-emerald-950/80 border-2 border-emerald-500/50 rounded-3xl p-4 space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center justify-between bg-emerald-900/60 p-2 rounded-xl text-emerald-200 font-black">
            <span>📲 WhatsApp हिशोब मेसेज</span>
            <span className="text-xs">१-क्लिक शेअर</span>
          </div>
          <div className="bg-slate-950/90 p-3 rounded-xl space-y-1.5 font-mono text-xs text-slate-200 border border-emerald-800">
            <div className="font-bold text-emerald-400">🌾 श्री गणेश अडत केंद्र</div>
            <div>शेतकरी: रमेश पाटील (F-102)</div>
            <div className="border-t border-slate-800 pt-1">• आजचे बिल: ₹४७,५००</div>
            <div>• उचल व खते वजा: ₹१५,०००</div>
            <div>• आजपर्यंत जमा: ₹२५,०००</div>
            <div className="text-amber-300 font-bold border-t border-slate-800 pt-1">👉 निव्वळ येणे/बाकी: ₹७,५००</div>
          </div>
          <button className="w-full py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1">
            ✓ WhatsApp वर पाठवले गेले
          </button>
        </div>
      )
    },
    {
      id: 6,
      title: "६. दैनिक नफा-तोटा व मार्जिन ॲनालायझर",
      duration: 15,
      subtitle: "अडत कमिशन पद्धत किंवा थेट ट्रेडिंग पद्धत निवडून तुम्ही रोजचा निव्वळ नफा आणि मार्जिन % लगेच तपासू शकता.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-400 uppercase">📊 P&L मार्जिन ॲनालायझर</span>
            <span className="bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded text-xs font-bold">Dual Mode Engine</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
            <div className="bg-purple-600 text-white p-2 rounded-xl shadow-xs">अडत कमिशन मोड (६%)</div>
            <div className="bg-slate-950 text-slate-400 p-2 rounded-xl border border-slate-800">थेट ट्रेडिंग मोड</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">आजची एकूण अडत कमाई:</span>
            <span className="text-sm font-black text-emerald-400">₹ ११,१२४ (६.०%)</span>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "७. शेतकरी व व्यापारी बँक-शैली खातावही",
      duration: 15,
      subtitle: "बँक पासबुकप्रमाणे क्रेडिट (जमा) व डेबिट (नावे) नोंदी दिसतात; ओळीवर क्लिक केल्यास संपूर्ण तपशील उघडतो.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center justify-between text-white font-black border-b border-slate-800 pb-2">
            <span>📑 शेतकरी लेजर स्टेटमेंट</span>
            <span className="text-emerald-400">रमेश पाटील</span>
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between bg-emerald-950/40 p-2 rounded-lg text-emerald-300">
              <span>१२ ऑक्टो • खरेदी पावती</span>
              <span>+ ₹४७,५०० (Credit)</span>
            </div>
            <div className="flex justify-between bg-rose-950/40 p-2 rounded-lg text-rose-300">
              <span>१४ ऑक्टो • रोख उचल</span>
              <span>- ₹२०,००० (Debit)</span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg text-amber-300 font-bold border border-slate-800">
              <span>चालू शिल्लक (Running Balance)</span>
              <span>₹२७,५०० बाकी</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 8,
      title: "८. कृषी साहित्य व आगाऊ उचल व्यवस्थापन",
      duration: 14,
      subtitle: "शेतकऱ्यांना दिलेली खते, औषधे, बियाणे आणि रोख उचल खात्यावर नावे होऊन बिलातून आपोआप वजा होते.",
      render: () => (
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3 animate-in fade-in">
          <div className="text-xs font-black text-rose-400 uppercase">🌱 कृषी साहित्य / उचल नोंद</div>
          <div className="space-y-2 text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between">
              <span className="text-slate-300">१० बॅग डीएपी खत</span>
              <span className="font-bold text-rose-400">- ₹१३,५०० (Debit)</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between">
              <span className="text-slate-300">रोख आगाऊ उचल</span>
              <span className="font-bold text-rose-400">- ₹१०,००० (Debit)</span>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-bold text-center">
            ✓ पुढील खरेदी बिलातून ही रक्कम आपोआप वजा केली जाईल.
          </div>
        </div>
      )
    },
    {
      id: 9,
      title: "९. विक्री, वाहतूक गाड्या व लॉजिस्टिक्स",
      duration: 15,
      subtitle: "गाडी नंबर, ड्रायव्हरचा फोन, गाडीचा प्रत्यक्ष फोटो व ड्रायव्हरची सही जोडून इन्-ट्रान्झिट ट्रॅकिंग करता येते.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3 text-xs animate-in fade-in">
          <div className="flex items-center justify-between text-blue-400 font-black">
            <span>🚛 वाहतूक पावती क्र. #SL-9021</span>
            <span className="bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded text-xs">IN TRANSIT</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">गाडी क्रमांक</span>
              <span className="font-black text-white">MH-12-RN-4455</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">चालक व स्वाक्षरी</span>
              <span className="font-bold text-emerald-400">सुरेश यादव ✓ Signed</span>
            </div>
          </div>
          <div className="bg-blue-950/40 p-2 rounded-xl text-xs text-blue-300 text-center font-bold">
            📷 गाडीचा फोटो व पोहोच पावती क्लाउडवर सुरक्षित.
          </div>
        </div>
      )
    },
    {
      id: 10,
      title: "१०. कामगार हजेरी व मजुरी व्यवस्थापन",
      duration: 14,
      subtitle: "दुकान व गोदामातील कामगारांची शिफ्ट (पूर्ण दिवस, अर्धा दिवस, ओव्हरटाईम) व मजुरीचे स्वयंचलित गणित.",
      render: () => (
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3 text-xs animate-in fade-in">
          <div className="text-xs font-black text-amber-400 uppercase">👷 कामगार हजेरी कार्ड</div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between font-bold text-white">
              <span>प्रकाश शिंदे (हमाल)</span>
              <span className="text-emerald-400">पूर्ण दिवस + २ तास OT</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>रोजंदारी: ₹४५० + OT: ₹१५०</span>
              <span className="text-amber-400 font-bold">आजची मजुरी: ₹६००</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 11,
      title: "११. कोल्ड स्टोरेज व साठा व्यवस्थापन",
      duration: 14,
      subtitle: "वेगवेगळ्या चेंबर्स आणि खोल्यांनुसार माल साठवणे व आवक-जावक साठ्याची अचूक नोंद ठेवणे.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-2 text-xs animate-in fade-in">
          <div className="text-xs font-black text-cyan-400 uppercase">❄️ कोल्ड स्टोरेज चेंबर इन्व्हेंटरी</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl">
              <span className="text-xs text-cyan-300 block font-bold">चेंबर क्र. १ (डाळिंब)</span>
              <span className="text-base font-black text-white">४५० क्रेट्स शिल्लक</span>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl">
              <span className="text-xs text-cyan-300 block font-bold">चेंबर क्र. २ (कांदा)</span>
              <span className="text-base font-black text-white">८२० गोणी शिल्लक</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 12,
      title: "१२. मोबाईल डिजिटल डायरी व स्प्रेडशीट",
      duration: 16,
      subtitle: "मोबाईलवर नेहमी दिसणारे मोठे सेव्ह बटण, चेकलिस्ट, आणि वजन व दर टाकल्यास बेरीज मोजणारा एक्सेल तक्ता.",
      render: () => (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3 text-xs animate-in fade-in">
          <div className="flex items-center justify-between text-purple-400 font-black">
            <span>📝 डिजिटल डायरी व स्प्रेडशीट</span>
            <span className="bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded text-xs">Auto-Sum ₹</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-300">
              <span>१० गोणी कांदा @ ₹३५</span>
              <span>= ₹३५०</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>२० गोणी डाळिंब @ ₹१२०</span>
              <span>= ₹२,४००</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-black border-t border-slate-800 pt-1">
              <span>∑ एकूण बेरीज (Grand Total):</span>
              <span>₹२,७५०</span>
            </div>
          </div>
          <button className="w-full py-2 bg-emerald-600 text-white font-black rounded-xl text-xs">
            💾 जतन करा व बंद करा (Sticky Save Bar)
          </button>
        </div>
      )
    },
    {
      id: 13,
      title: "१३. डेटा सुरक्षा व गोपनीयता",
      duration: 15,
      subtitle: "Row Level Security (RLS) मुळे प्रत्येक अडत्याचा डेटा १००% सुरक्षित आणि गोपनीय राहतो.",
      render: () => (
        <div className="w-full max-w-md bg-emerald-950/90 border-2 border-emerald-500/60 rounded-3xl p-5 text-center space-y-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
            🛡️
          </div>
          <h3 className="text-sm font-black text-white">१००% क्लाउड सुरक्षा व गोपनीयता</h3>
          <p className="text-xs text-emerald-200 font-semibold leading-relaxed">
            Row Level Security (RLS) मुळे एका व्यापाऱ्याचा हिशोब दुसऱ्या कोणालाही दिसू शकत नाही. आपला सर्व डेटा सुरक्षित व बॅकअपयुक्त आहे.
          </p>
        </div>
      )
    }
  ];

  const speakMarathi = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const mrVoice = voices.find((v) => v.lang.includes('mr') || v.lang.includes('hi') || v.lang.includes('IN'));
    if (mrVoice) {
      utterance.voice = mrVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isPlaying) {
      if (!isAudioMuted) {
        speakMarathi(SCENES[currentSceneIdx].subtitle);
      }
      timerRef.current = setInterval(() => {
        setSceneTimer((prev) => {
          if (prev >= SCENES[currentSceneIdx].duration) {
            if (currentSceneIdx < SCENES.length - 1) {
              setCurrentSceneIdx((c) => c + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentSceneIdx, isAudioMuted, playbackSpeed]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentSceneIdx < SCENES.length - 1) {
      setCurrentSceneIdx((prev) => prev + 1);
      setSceneTimer(0);
    }
  };

  const handlePrev = () => {
    if (currentSceneIdx > 0) {
      setCurrentSceneIdx((prev) => prev - 1);
      setSceneTimer(0);
    }
  };

  const currentScene = SCENES[currentSceneIdx];
  const progressPercent = ((currentSceneIdx + 1) / SCENES.length) * 100;

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-2xl shadow-xs">
                🎬
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  {language === 'mr' ? 'कृषी CRM संपूर्ण मराठी व्हिडिओ मार्गदर्शक' : 'Agricultural CRM Video Walkthrough'}
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-black animate-pulse">
                    ● HD VIDEO
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {language === 'mr'
                    ? 'सर्व १३ मॉड्यूल्सचे संथ गतीत मराठी व्हॉईसओव्हरसह प्रत्यक्ष प्रात्यक्षिक.'
                    : 'Step-by-step interactive video guide with Marathi voiceover and simulated UI screens.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>{isPlaying ? (language === 'mr' ? 'व्हिडिओ थांबवा' : 'Pause') : (language === 'mr' ? 'व्हिडिओ सुरू करा' : 'Play Video')}</span>
              </button>
            </div>
          </div>

          {/* Main Video Cinema Container */}
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-2xl flex flex-col justify-between p-4 sm:p-8">
            {/* Top Bar inside Video */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  भाग {currentScene.id} / {SCENES.length}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-bold text-white">{currentScene.title}</span>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-slate-300 border border-white/10">
                🌾 Seavaig Agricultural CRM
              </div>
            </div>

            {/* Video Center Animation Content */}
            <div className="flex-1 flex items-center justify-center my-auto z-10 w-full max-w-4xl mx-auto">
              {currentScene.render()}
            </div>

            {/* Subtitle Bar at Bottom */}
            <div className="z-10">
              <div className="bg-black/85 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center shadow-xl">
                <p className="text-sm sm:text-base font-black text-amber-300 leading-relaxed drop-shadow-md">
                  "{currentScene.subtitle}"
                </p>
              </div>
            </div>

            {/* Play Overlay if Not Started */}
            {!isPlaying && sceneTimer === 0 && currentSceneIdx === 0 && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center text-3xl font-black shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                >
                  <Play className="w-8 h-8 fill-slate-950 ml-1" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">मराठी व्हिडिओ सुरू करण्यासाठी येथे क्लिक करा</h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-1">
                    संथ गतीतील मराठी व्हॉईसओव्हरसह सर्व फिचर्सचे सविस्तर प्रात्यक्षिक.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Video Control Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                  <span>{language === 'mr' ? 'मागे' : 'Prev'}</span>
                </button>
                <button
                  onClick={togglePlay}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  <span>{isPlaying ? (language === 'mr' ? 'थांबवा' : 'Pause') : (language === 'mr' ? 'प्ले करा' : 'Play')}</span>
                </button>
                <button
                  onClick={handleNext}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{language === 'mr' ? 'पुढे' : 'Next'}</span>
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Playback speed */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-400 font-bold">गती:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-transparent text-emerald-400 font-black focus:outline-none cursor-pointer"
                  >
                    <option value="0.75" className="bg-slate-900">0.75x (संथ - Slow)</option>
                    <option value="0.85" className="bg-slate-900">0.85x (मध्यम - Normal)</option>
                    <option value="1.0" className="bg-slate-900">1.0x (जलद - Fast)</option>
                  </select>
                </div>

                {/* Voice Toggle */}
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  <span>{isAudioMuted ? 'आवाज बंद' : 'आवाज चालू'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chapter Selector Grid */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              📑 थेट कोणत्याही विषयावर जा (Jump to Module)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {SCENES.map((scene, idx) => (
                <button
                  key={scene.id}
                  onClick={() => {
                    setCurrentSceneIdx(idx);
                    setSceneTimer(0);
                  }}
                  className={`p-3 text-left rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    currentSceneIdx === idx
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="block truncate">{scene.title}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
