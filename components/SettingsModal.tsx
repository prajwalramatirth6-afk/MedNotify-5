
import React from 'react';

export interface UserSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  vibrateEnabled: boolean;
  alarmStyle: 'gentle' | 'urgent';
  snoozeDuration: number; // in minutes
  missedWindow: number; // in minutes
}

interface SettingsModalProps {
  settings: UserSettings;
  updateSettings: (newSettings: UserSettings) => void;
  onClose: () => void;
  onLogout: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, updateSettings, onClose, onLogout }) => {
  const toggle = (key: keyof UserSettings) => {
    updateSettings({ ...settings, [key]: !settings[key] });
  };

  const handleLogoutClick = () => {
    if (window.confirm("Are you sure? This will delete all your medications, logs, and profile data permanently.")) {
      onLogout();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-800">Preferences</h3>
          <button onClick={onClose} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
        </div>

        <div className="space-y-6">
          {/* Audio Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alarm Settings</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold text-slate-700">Sound Alarm</p>
                <p className="text-[10px] text-slate-400">Play audio when it's time</p>
              </div>
              <button 
                onClick={() => toggle('soundEnabled')}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.soundEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => updateSettings({...settings, alarmStyle: 'gentle'})}
                className={`p-3 rounded-xl border-2 transition-all font-bold text-xs ${settings.alarmStyle === 'gentle' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
              >
                🌊 Gentle
              </button>
              <button 
                onClick={() => updateSettings({...settings, alarmStyle: 'urgent'})}
                className={`p-3 rounded-xl border-2 transition-all font-bold text-xs ${settings.alarmStyle === 'urgent' ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-100 text-slate-400'}`}
              >
                🚨 Urgent
              </button>
            </div>
          </div>

          {/* Snooze Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snooze Duration</h4>
            <div className="flex justify-between gap-2">
              {[5, 10, 15, 30].map(mins => (
                <button 
                  key={mins}
                  onClick={() => updateSettings({...settings, snoozeDuration: mins})}
                  className={`flex-1 py-2 rounded-xl border-2 transition-all font-bold text-[10px] ${settings.snoozeDuration === mins ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Missed Window Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missed Window</h4>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Auto-log after duration</span>
            </div>
            <div className="flex justify-between gap-2">
              {[15, 30, 60, 120].map(mins => (
                <button 
                  key={mins}
                  onClick={() => updateSettings({...settings, missedWindow: mins})}
                  className={`flex-1 py-2 rounded-xl border-2 transition-all font-bold text-[10px] ${settings.missedWindow === mins ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-slate-100 text-slate-400'}`}
                >
                  {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold text-slate-700">Push Notifications</p>
                <p className="text-[10px] text-slate-400">System level alerts</p>
              </div>
              <button 
                onClick={() => toggle('notificationsEnabled')}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button 
              onClick={onClose}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Save Preferences
            </button>
            <button 
              onClick={handleLogoutClick}
              className="w-full bg-white text-red-600 border-2 border-red-100 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center space-x-2"
            >
              <span>🚪</span>
              <span>Reset & Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
