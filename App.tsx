
import React, { useState, useEffect, useRef } from 'react';
import { Medication, DoseLog, Frequency, Prescription, Pharmacy } from './types';
import Navigation from './components/Navigation';
import MedicineForm from './components/MedicineForm';
import SettingsModal, { UserSettings } from './components/SettingsModal';
import { getDailyHealthTip, findNearbyPharmacies } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'pharmacy' | 'history' | 'prescriptions'>('dashboard');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [deletedMedications, setDeletedMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [alertMed, setAlertMed] = useState<Medication | null>(null);
  const [lastNotified, setLastNotified] = useState<Record<string, string>>({}); 
  const [dailyTip, setDailyTip] = useState<string>("");
  const [loadingTip, setLoadingTip] = useState(true);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [snoozedMeds, setSnoozedMeds] = useState<Record<string, number>>({});
  
  // Prescription Form State
  const [isRxFormOpen, setIsRxFormOpen] = useState(false);
  const [rxTitle, setRxTitle] = useState("");
  const [rxDoctor, setRxDoctor] = useState("");
  const [rxDate, setRxDate] = useState(new Date().toISOString().split('T')[0]);
  const [rxImage, setRxImage] = useState<string | null>(null);
  const rxFileInputRef = useRef<HTMLInputElement>(null);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);

  const [settings, setSettings] = useState<UserSettings>({
    soundEnabled: true,
    notificationsEnabled: true,
    vibrateEnabled: true,
    alarmStyle: 'urgent',
    snoozeDuration: 5,
    missedWindow: 60 // Default 60 minutes
  });

  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const alarmInterval = useRef<number | null>(null);

  const LOGO_URL = "https://raw.githubusercontent.com/hexonova/assets/main/mednotify-logo.png";
  const FALLBACK_LOGO = "https://cdn-icons-png.flaticon.com/512/883/883407.png";

  useEffect(() => {
    const savedMeds = localStorage.getItem('mednotify_meds');
    const savedDeletedMeds = localStorage.getItem('mednotify_deleted_meds');
    const savedLogs = localStorage.getItem('mednotify_logs');
    const savedLastNotified = localStorage.getItem('mednotify_last_notified');
    const savedName = localStorage.getItem('mednotify_username');
    const savedPhoto = localStorage.getItem('mednotify_userphoto');
    const savedSettings = localStorage.getItem('mednotify_settings');
    const savedRx = localStorage.getItem('mednotify_prescriptions');
    
    if (savedMeds) setMedications(JSON.parse(savedMeds));
    if (savedDeletedMeds) setDeletedMedications(JSON.parse(savedDeletedMeds));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedLastNotified) setLastNotified(JSON.parse(savedLastNotified));
    if (savedPhoto) setUserPhoto(savedPhoto);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedRx) setPrescriptions(JSON.parse(savedRx));
    
    if (savedName) {
      setUserName(savedName);
    } else {
      setIsNameModalOpen(true);
    }

    if ("Notification" in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchTip = async () => {
      setLoadingTip(true);
      const tip = await getDailyHealthTip();
      setDailyTip(tip);
      setLoadingTip(false);
    };
    fetchTip();

    const unlockAudio = () => {
      initAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (userName) {
      localStorage.setItem('mednotify_meds', JSON.stringify(medications));
      localStorage.setItem('mednotify_deleted_meds', JSON.stringify(deletedMedications));
      localStorage.setItem('mednotify_logs', JSON.stringify(logs));
      localStorage.setItem('mednotify_last_notified', JSON.stringify(lastNotified));
      localStorage.setItem('mednotify_settings', JSON.stringify(settings));
      localStorage.setItem('mednotify_username', userName);
      localStorage.setItem('mednotify_prescriptions', JSON.stringify(prescriptions));
      if (userPhoto) localStorage.setItem('mednotify_userphoto', userPhoto);
    }
  }, [medications, deletedMedications, logs, lastNotified, userName, userPhoto, settings, prescriptions]);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume().then(() => setIsAudioReady(true));
    } else {
      setIsAudioReady(true);
    }
  };

  const startAlarm = () => {
    if (!settings.soundEnabled || !audioCtx.current) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();

    const playTone = () => {
      if (!audioCtx.current) return;
      const ctx = audioCtx.current;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      if (settings.alarmStyle === 'gentle') {
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(330, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
        osc2.frequency.setValueAtTime(333, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(443, ctx.currentTime + 1.0);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
      } else {
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
        osc2.frequency.setValueAtTime(445, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(885, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.35);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      }

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      const duration = settings.alarmStyle === 'gentle' ? 1.0 : 0.4;
      osc1.stop(ctx.currentTime + duration);
      osc2.stop(ctx.currentTime + duration);
    };

    if (!alarmInterval.current) {
      playTone();
      const interval = settings.alarmStyle === 'gentle' ? 1200 : 450;
      alarmInterval.current = window.setInterval(playTone, interval);
    }
  };

  const stopAlarm = () => {
    if (alarmInterval.current) {
      clearInterval(alarmInterval.current);
      alarmInterval.current = null;
    }
  };

  useEffect(() => {
    if (alertMed) startAlarm();
    else stopAlarm();
    return () => stopAlarm();
  }, [alertMed, settings.alarmStyle]);

  const handleLogDose = (medId: string, status: 'taken' | 'skipped' | 'missed') => {
    initAudio();
    const newLog: DoseLog = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId: medId,
      timestamp: new Date().toISOString(),
      status
    };
    
    setLogs(prev => [newLog, ...prev]);
    
    if (status === 'taken') {
      setMedications(prev => prev.map(m => 
        m.id === medId ? { ...m, remainingDoses: Math.max(0, m.remainingDoses - 1) } : m
      ));
    }
    
    if (alertMed?.id === medId) setAlertMed(null);
    setSnoozedMeds(prev => {
      const next = { ...prev };
      delete next[medId];
      return next;
    });
  };

  const handleSnooze = () => {
    if (!alertMed) return;
    initAudio();
    const snoozeTime = Date.now() + (settings.snoozeDuration * 60000);
    setSnoozedMeds(prev => ({ ...prev, [alertMed.id]: snoozeTime }));
    setAlertMed(null);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      medications.forEach(med => {
        const notificationKey = `${med.id}-${today}-${currentTimeStr}`;
        const [medHours, medMinutes] = med.time.split(':').map(Number);
        
        if (med.time === currentTimeStr && !lastNotified[notificationKey]) {
          const alreadyLogged = logs.some(log => log.medicationId === med.id && log.timestamp.startsWith(today));
          if (!alreadyLogged) triggerAlert(med, notificationKey, today);
        }

        const snoozeTarget = snoozedMeds[med.id];
        if (snoozeTarget && Date.now() >= snoozeTarget) {
          triggerAlert(med, `snooze-${med.id}-${Date.now()}`, today);
          setSnoozedMeds(prev => {
            const next = { ...prev };
            delete next[med.id];
            return next;
          });
        }

        const scheduledToday = new Date(now);
        scheduledToday.setHours(medHours, medMinutes, 0, 0);
        const missedThreshold = scheduledToday.getTime() + (settings.missedWindow * 60000);
        if (now.getTime() > missedThreshold) {
           const hasLogToday = logs.some(log => log.medicationId === med.id && log.timestamp.startsWith(today));
           if (!hasLogToday) {
             handleLogDose(med.id, 'missed');
             if (alertMed?.id === med.id) setAlertMed(null);
           }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [medications, logs, lastNotified, snoozedMeds, settings.missedWindow, alertMed]);

  const triggerAlert = (med: Medication, key: string, today: string) => {
    setLastNotified(prev => ({ ...prev, [key]: today }));
    setAlertMed(med);
    if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification(`ALARM: Take ${med.name}`, {
        body: `Dose: ${med.dose}.${med.notes ? `\nNote: ${med.notes}` : ''}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/883/883407.png',
        tag: `med-alarm-${med.id}`,
        requireInteraction: true 
      });
    }
  };

  const handleAddMed = (med: Medication) => {
    initAudio();
    setMedications(prev => [...prev, med]);
  };

  const handleUpdateMed = (updatedMed: Medication) => {
    initAudio();
    setMedications(prev => prev.map(m => m.id === updatedMed.id ? updatedMed : m));
    setEditingMed(null);
  };

  const handleDeleteRequest = (e: React.MouseEvent, medId: string) => {
    e.preventDefault();
    e.stopPropagation();
    initAudio();
    setDeletingMedId(medId);
  };

  const confirmDelete = () => {
    if (!deletingMedId) return;
    const medToDelete = medications.find(m => m.id === deletingMedId);
    if (medToDelete) setDeletedMedications(prev => [medToDelete, ...prev].slice(0, 10)); 
    setMedications(prev => prev.filter(m => m.id !== deletingMedId));
    setDeletingMedId(null);
  };

  const handleRestoreMed = (medId: string) => {
    initAudio();
    const medToRestore = deletedMedications.find(m => m.id === medId);
    if (medToRestore) {
      setMedications(prev => [...prev, medToRestore]);
      setDeletedMedications(prev => prev.filter(m => m.id !== medId));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRxPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRxImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxImage || !rxTitle) return;
    const newRx: Prescription = {
      id: Math.random().toString(36).substr(2, 9),
      title: rxTitle,
      doctorName: rxDoctor,
      date: rxDate,
      image: rxImage
    };
    setPrescriptions(prev => [newRx, ...prev]);
    setIsRxFormOpen(false);
    setRxTitle("");
    setRxDoctor("");
    setRxImage(null);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsNameModalOpen(false);
      initAudio();
    }
  };

  const handleLogout = () => {
    setAlertMed(null);
    stopAlarm();
    setMedications([]);
    setDeletedMedications([]);
    setLogs([]);
    setLastNotified({});
    setUserName(null);
    setUserPhoto(null);
    setPrescriptions([]);
    localStorage.clear();
    setIsSettingsOpen(false);
    setIsNameModalOpen(true);
    setActiveTab('dashboard');
  };

  const openPharmacyInMaps = () => {
    initAudio();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.open(`https://www.google.com/maps/search/pharmacy/@${pos.coords.latitude},${pos.coords.longitude},15z`, '_blank');
      },
      () => alert("Location access is required."),
      { enableHighAccuracy: true }
    );
  };

  const fetchNearbyPharmacies = () => {
    initAudio();
    setLoadingPharmacies(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const results = await findNearbyPharmacies(pos.coords.latitude, pos.coords.longitude);
        if (results) {
          setNearbyPharmacies(results);
        } else {
          alert("Could not find pharmacies near your current location.");
        }
        setLoadingPharmacies(false);
      },
      () => {
        alert("Location access is required to find pharmacies.");
        setLoadingPharmacies(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const getExpiryState = (dateStr?: string) => {
    if (!dateStr) return 'safe';
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 5) return 'critical';
    if (diffDays <= 30) return 'warning';
    return 'safe';
  };

  // Helper function to determine if a medication is expired
  const isExpired = (dateStr?: string) => getExpiryState(dateStr) === 'expired';

  const getLogStatusToday = (medId: string) => logs.find(l => l.medicationId === medId && l.timestamp.startsWith(new Date().toISOString().split('T')[0]))?.status;

  const HighlightedNote = ({ note }: { note: string }) => (
    <div className="mt-2.5 p-3 bg-blue-50/50 border-l-4 border-blue-400 rounded-r-2xl animate-in slide-in-from-left-2 duration-300">
      <p className="text-sm font-semibold text-blue-900 leading-snug italic">"{note}"</p>
    </div>
  );

  const RefillBadge = ({ count }: { count: number }) => (
    <div className="mt-2 flex items-center space-x-1.5 px-2 py-1 rounded-lg w-fit bg-amber-500 text-white shadow-sm animate-bounce">
      <span className="text-xs">⚠️</span>
      <span className="text-[9px] font-black tracking-tight uppercase">REFILL: {count} LEFT</span>
    </div>
  );

  const ExpiryBadge = ({ date }: { date: string }) => {
    const state = getExpiryState(date);
    const config: Record<string, { bg: string; text: string; label: string; icon: string; pulse?: boolean }> = {
      expired: { bg: 'bg-red-600', text: 'text-white', label: 'EXPIRED', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      critical: { bg: 'bg-amber-100 border-2 border-amber-500', text: 'text-amber-700', label: 'EXPIRING SOON!', pulse: true, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      warning: { bg: 'bg-orange-50 border border-orange-200', text: 'text-orange-600', label: 'EXP:', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      safe: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'EXP:', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
    };
    const current = config[state] || config.safe;
    return (
      <div className={`mt-2 flex items-center space-x-1.5 px-2 py-0.5 rounded-lg w-fit ${current.bg} ${current.text} ${current.pulse ? 'animate-pulse scale-105' : ''}`}>
        <span className="text-[8.5px] font-black tracking-tight">{current.label} {new Date(date).toLocaleDateString()}</span>
      </div>
    );
  };

  const medicationsNeedingRefill = medications.filter(m => m.remainingDoses <= m.refillThreshold && m.remainingDoses > 0);

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-slate-50 shadow-xl relative overflow-x-hidden no-scrollbar">
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />

      {isNameModalOpen && (
        <div className="fixed inset-0 bg-blue-600 z-[300] flex items-center justify-center p-6 text-white animate-in fade-in duration-500">
          <div className="max-w-xs w-full text-center space-y-8">
            <div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 bg-white rounded-full flex items-center justify-center overflow-hidden mx-auto shadow-2xl border-4 border-white/20 cursor-pointer transition-all">
              {userPhoto ? <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl text-blue-600">📸</span>}
            </div>
            <h2 className="text-4xl font-black tracking-tighter">Welcome!</h2>
            <form onSubmit={handleSaveName} className="space-y-4">
              <input autoFocus type="text" placeholder="Your name..." className="w-full bg-white/10 border-2 border-white/30 p-5 rounded-3xl text-xl font-bold placeholder:text-blue-200 focus:bg-white/20 outline-none text-center" value={tempName} onChange={(e) => setTempName(e.target.value)} />
              <button type="submit" className="w-full bg-white text-blue-600 font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-xl">Get Started</button>
            </form>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 z-40 border-b border-slate-100 flex justify-between items-center">
        <div onClick={initAudio} className="cursor-pointer flex items-center space-x-3">
          <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm border border-slate-100" onError={(e) => (e.currentTarget.src = FALLBACK_LOGO)} />
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Med-Notify</h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Powered by HEXONOVA</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => { initAudio(); setIsSettingsOpen(true); }} className="p-3 bg-slate-100 rounded-full text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
          <div onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden cursor-pointer">{userPhoto ? <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}</div>
        </div>
      </header>

      {activeTab === 'dashboard' && (
        <main className="px-6 py-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 font-bold text-sm">Hi,</span>
            <h2 className="text-2xl font-black text-blue-600 uppercase tracking-tight">{userName || 'User'} 👋</h2>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
            <h2 className="text-lg font-semibold opacity-90 mb-1">Today's Progress</h2>
            <div className="flex items-baseline space-x-2 mb-4">
              <span className="text-4xl font-bold">{logs.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0]) && l.status === 'taken').length}</span>
              <span className="text-blue-100 opacity-75">/ {medications.length} doses</span>
            </div>
            <div className="w-full bg-blue-900/30 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full transition-all duration-1000" style={{ width: `${(logs.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0]) && l.status === 'taken').length / (medications.length || 1)) * 100}%` }} />
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
             <button onClick={() => setIsRxFormOpen(true)} className="shrink-0 flex items-center space-x-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all">
               <span className="text-lg">📂</span>
               <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Upload Prescription</span>
             </button>
          </div>

          {medicationsNeedingRefill.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 animate-in slide-in-from-top-2">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">⚠️</span>
                <h4 className="text-sm font-black text-amber-800 uppercase tracking-wider">Refill Required</h4>
              </div>
              <div className="space-y-2">
                {medicationsNeedingRefill.map(med => (
                  <div key={med.id} className="flex justify-between items-center bg-white/60 p-3 rounded-2xl border border-amber-100">
                    <span className="text-sm font-bold text-slate-700">{med.name}</span>
                    <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-100 px-2 py-1 rounded-lg">{med.remainingDoses} doses left</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setActiveTab('pharmacy')} className="w-full mt-4 bg-amber-500 text-white font-black py-3 rounded-2xl text-xs uppercase shadow-lg">Find Pharmacy Nearby</button>
            </div>
          )}

          <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm flex items-start space-x-4">
            <div className="text-2xl bg-blue-50 p-3 rounded-2xl text-blue-600 shrink-0">{loadingTip ? "⏳" : "💡"}</div>
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Daily Health Insight</h4>
              <p className="text-sm font-medium text-slate-700 italic">"{dailyTip}"</p>
            </div>
          </div>
          <div>
            <h3 className="text-slate-800 font-bold mb-4">⏰ Your Medicines</h3>
            <div className="space-y-4">
              {medications.map(med => {
                const status = getLogStatusToday(med.id);
                const expired = isExpired(med.expiryDate);
                const needsRefill = med.remainingDoses <= med.refillThreshold && med.remainingDoses > 0;
                
                return (
                  <div key={med.id} onClick={() => { initAudio(); setEditingMed(med); }} className={`bg-white p-5 rounded-3xl shadow-sm border transition-all relative cursor-pointer active:scale-[0.98] ${status === 'taken' ? 'border-green-400 bg-green-50' : status === 'skipped' ? 'border-orange-400 bg-orange-50' : 'border-slate-100'}`}>
                    <div className="flex justify-between items-start pr-24">
                      <div className="flex space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${status === 'taken' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                          {status === 'taken' ? '✓' : '💊'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{med.name}</h4>
                          <p className="text-xs text-slate-500">{med.dose} • {med.time}</p>
                          {med.notes && <HighlightedNote note={med.notes} />}
                          <div className="flex flex-wrap gap-2">
                             {med.expiryDate && <ExpiryBadge date={med.expiryDate} />}
                             {needsRefill && <RefillBadge count={med.remainingDoses} />}
                          </div>
                        </div>
                      </div>
                      <div className="absolute right-12 top-6 flex flex-col space-y-2">
                        {!status && !expired && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleLogDose(med.id, 'taken'); }} 
                              className="w-8 h-8 rounded-full border-2 border-green-200 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all"
                            >✓</button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleLogDose(med.id, 'skipped'); }} 
                              className="w-8 h-8 rounded-full border-2 border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                            >✕</button>
                          </>
                        )}
                        {status && (
                           <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight ${status === 'taken' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}`}>
                              {status}
                           </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); initAudio(); setEditingMed(med); }} className="text-slate-300 hover:text-blue-600 p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button type="button" onClick={(e) => handleDeleteRequest(e, med.id)} className="text-slate-300 hover:text-red-600 p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => { initAudio(); setIsFormOpen(true); }} className="w-full py-6 mt-4 border-2 border-dashed border-blue-200 rounded-3xl bg-blue-50 text-blue-700 font-black">+ Add New Medication</button>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'schedule' && (
        <main className="px-6 py-4 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-slate-800 mb-4">🕒 Daily Schedule</h2>
          {medications.sort((a,b) => a.time.localeCompare(b.time)).map(med => (
            <div key={med.id} className="flex flex-col p-5 rounded-3xl border bg-white shadow-md border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-bold text-blue-600">{med.time}</span>
                  <h4 className="font-bold text-slate-800">{med.name}</h4>
                </div>
                <div className="flex space-x-2">
                   {getLogStatusToday(med.id) ? (
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 text-slate-400 rounded-lg">{getLogStatusToday(med.id)}</span>
                   ) : (
                      <button onClick={() => handleLogDose(med.id, 'taken')} className="text-[10px] font-black uppercase text-green-600 px-3 py-1.5 bg-green-50 rounded-lg">Mark Taken</button>
                   )}
                   <button onClick={() => { initAudio(); setEditingMed(med); }} className="text-[10px] font-black uppercase text-blue-500 px-3 py-1.5 bg-blue-50 rounded-lg">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </main>
      )}

      {activeTab === 'prescriptions' && (
        <main className="px-6 py-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black text-slate-800">Rx Vault</h2>
            <button onClick={() => setIsRxFormOpen(true)} className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all">+ Upload Rx</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {prescriptions.map(rx => (
              <div key={rx.id} onClick={() => setViewingRx(rx)} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer">
                <img src={rx.image} alt={rx.title} className="w-full h-32 object-cover" />
                <div className="p-3"><h5 className="font-bold text-slate-800 text-sm truncate">{rx.title}</h5></div>
              </div>
            ))}
          </div>
        </main>
      )}

      {activeTab === 'pharmacy' && (
        <main className="px-6 py-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 text-center">
             <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📍</div>
             <h2 className="text-xl font-black text-slate-800 mb-1">Nearby Pharmacies</h2>
             <p className="text-xs text-slate-400 mb-6">Discovery powered by Google Maps</p>
             
             {loadingPharmacies ? (
                <div className="py-12 space-y-4">
                  <div className="animate-spin text-4xl mx-auto">⏳</div>
                  <p className="text-sm font-bold text-blue-600 animate-pulse">Scanning local area...</p>
                </div>
             ) : nearbyPharmacies.length > 0 ? (
                <div className="space-y-3 mb-6 text-left">
                  {nearbyPharmacies.map((pharm, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group active:scale-95 transition-all">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{pharm.name}</h4>
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Pharmacy</p>
                      </div>
                      <button onClick={() => window.open(pharm.uri, '_blank')} className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={fetchNearbyPharmacies} className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest py-3">Refresh List</button>
                </div>
             ) : (
                <div className="space-y-4 mb-6">
                  <button onClick={fetchNearbyPharmacies} className="w-full bg-blue-50 text-blue-600 font-black py-4 rounded-2xl border-2 border-dashed border-blue-200 active:scale-95 transition-all">
                    Find Pharmacies Near Me
                  </button>
                </div>
             )}

             <button onClick={openPharmacyInMaps} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl active:scale-95 transition-all shadow-xl text-lg flex items-center justify-center space-x-3">
               <span>🚀 Open Google Maps</span>
             </button>
           </div>
        </main>
      )}

      {activeTab === 'history' && (
        <main className="px-6 py-4 space-y-12 animate-in fade-in slide-in-from-bottom-4">
           <section>
             <h2 className="text-xl font-bold text-slate-800 mb-4">📝 Medication Logs</h2>
             <div className="space-y-3">
               {logs.slice(0, 50).map(log => (
                 <div key={log.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                   <h5 className="font-bold text-slate-800 text-sm">{(medications.find(m => m.id === log.medicationId) || deletedMedications.find(m => m.id === log.medicationId))?.name}</h5>
                   <div className="flex items-center space-x-2">
                      <span className="text-[8px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                        log.status === 'taken' ? 'bg-green-50 text-green-600' : 
                        log.status === 'skipped' ? 'bg-orange-50 text-orange-600' : 
                        'bg-red-50 text-red-600'
                      }`}>
                        {log.status}
                      </span>
                   </div>
                 </div>
               ))}
             </div>
           </section>
           
           <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">🗑️ Recently Deleted (Undo)</h2>
              <div className="space-y-3">
                {deletedMedications.map(med => (
                  <div key={med.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 opacity-80">
                    <div>
                      <h5 className="font-bold text-slate-700 text-sm">{med.name}</h5>
                      <p className="text-[10px] text-slate-400">{med.dose}</p>
                    </div>
                    <button 
                      onClick={() => handleRestoreMed(med.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-md shadow-blue-100 active:scale-95 transition-all"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
           </section>
        </main>
      )}

      {/* Modals & Alerts */}
      {deletingMedId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center">
            <h3 className="text-2xl font-black mb-8">Delete Medication?</h3>
            <button onClick={confirmDelete} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl mb-2">Yes, Delete</button>
            <button onClick={() => setDeletingMedId(null)} className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl">Cancel</button>
          </div>
        </div>
      )}

      {alertMed && (
        <div className="fixed inset-0 bg-red-600 z-[200] flex items-center justify-center p-8 text-white text-center animate-pulse">
          <div className="space-y-8">
            <div className="text-9xl">🚨</div>
            <h2 className="text-6xl font-black uppercase tracking-tight">Take {alertMed.name}</h2>
            <button onClick={() => handleLogDose(alertMed.id, 'taken')} className="w-full bg-white text-red-600 font-black py-8 rounded-[40px] text-3xl">I TOOK IT</button>
            <div className="flex gap-4">
              <button onClick={handleSnooze} className="flex-1 bg-red-700/50 text-white font-black py-4 rounded-3xl">SNOOZE</button>
              <button onClick={() => handleLogDose(alertMed.id, 'skipped')} className="flex-1 bg-red-900/40 text-white font-bold py-4 rounded-3xl">SKIP</button>
            </div>
          </div>
        </div>
      )}

      {isRxFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-800">New Rx Photo</h3>
                <button onClick={() => setIsRxFormOpen(false)} className="text-slate-400 p-2">✕</button>
             </div>
             <form onSubmit={handleSaveRx} className="space-y-4">
                <div onClick={() => rxFileInputRef.current?.click()} className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
                   {rxImage ? <img src={rxImage} alt="Rx" className="w-full h-full object-cover" /> : <span className="text-4xl">📸</span>}
                   <input type="file" accept="image/*" ref={rxFileInputRef} className="hidden" onChange={handleRxPhotoUpload} />
                </div>
                <input required type="text" placeholder="Title (e.g. Cardiologist)" className="w-full p-4 bg-slate-50 border-none rounded-2xl" value={rxTitle} onChange={(e) => setRxTitle(e.target.value)} />
                <button disabled={!rxImage} type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl">Save</button>
             </form>
          </div>
        </div>
      )}

      {isSettingsOpen && <SettingsModal settings={settings} updateSettings={setSettings} onClose={() => setIsSettingsOpen(false)} onLogout={handleLogout} />}
      {(isFormOpen || editingMed) && <MedicineForm onAdd={handleAddMed} onUpdate={handleUpdateMed} initialData={editingMed} onClose={() => { setIsFormOpen(false); setEditingMed(null); }} />}
      <Navigation activeTab={activeTab} setActiveTab={(tab) => { initAudio(); setActiveTab(tab); }} />
    </div>
  );
};

export default App;
