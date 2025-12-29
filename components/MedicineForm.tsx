
import React, { useState, useEffect } from 'react';
import { Medication, Frequency } from '../types';
import { getMedicationInsight } from '../services/geminiService';

interface MedicineFormProps {
  onAdd?: (med: Medication) => void;
  onUpdate?: (med: Medication) => void;
  onClose: () => void;
  initialData?: Medication | null;
}

const MedicineForm: React.FC<MedicineFormProps> = ({ onAdd, onUpdate, onClose, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    dose: '',
    time: '08:00',
    frequency: Frequency.DAILY,
    durationDays: 30,
    remainingDoses: 30,
    refillThreshold: 5,
    notes: '',
    expiryDate: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        dose: initialData.dose,
        time: initialData.time,
        frequency: initialData.frequency,
        durationDays: initialData.durationDays,
        remainingDoses: initialData.remainingDoses,
        refillThreshold: initialData.refillThreshold,
        notes: initialData.notes || '',
        expiryDate: initialData.expiryDate || ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Only fetch new insight if it's a new med or the name/dose changed
    let insight = initialData?.aiInsight;
    if (!initialData || initialData.name !== formData.name || initialData.dose !== formData.dose) {
      insight = await getMedicationInsight(formData.name, formData.dose);
    }
    
    if (initialData && onUpdate) {
      const updatedMed: Medication = {
        ...initialData,
        ...formData,
        aiInsight: insight
      };
      onUpdate(updatedMed);
    } else if (onAdd) {
      const newMed: Medication = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        startDate: new Date().toISOString(),
        aiInsight: insight
      };
      onAdd(newMed);
    }
    
    setLoading(false);
    onClose();
  };

  const isEdit = !!initialData;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[160] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Medicine' : 'New Medicine'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Paracetamol"
              className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dosage</label>
              <input
                required
                type="text"
                placeholder="e.g. 500mg"
                className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.dose}
                onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Time</label>
              <input
                required
                type="time"
                className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <label className="flex items-center space-x-2 text-sm font-bold text-blue-700 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Product Expiry Date</span>
              <span className="text-[10px] font-normal text-blue-400 tracking-tight uppercase">(Optional)</span>
            </label>
            <input
              type="date"
              className="w-full p-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
            <select
              className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Frequency })}
            >
              {Object.values(Frequency).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Pills</label>
              <input
                type="number"
                className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.remainingDoses}
                onChange={(e) => setFormData({ ...formData, remainingDoses: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Refill Warning at</label>
              <input
                type="number"
                className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.refillThreshold}
                onChange={(e) => setFormData({ ...formData, refillThreshold: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              className="w-full p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="animate-spin text-xl">⌛</span>
            ) : (
              <span>{isEdit ? 'Update Medication' : 'Add Medication'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MedicineForm;
