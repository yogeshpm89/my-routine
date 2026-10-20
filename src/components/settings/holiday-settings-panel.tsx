'use client';

import React, { useState, useEffect } from 'react';
import { HolidayService, HolidayItem } from '@/lib/holidays/holiday-service';
import { formatDisplayDate, getTodayDateString } from '@/lib/time-utils';
import { Palmtree, Plus, Trash2, Calendar, CheckCircle2 } from 'lucide-react';

interface HolidaySettingsPanelProps {
  userId: string;
  onHolidaysChange?: () => void;
}

export function HolidaySettingsPanel({ userId, onHolidaysChange }: HolidaySettingsPanelProps) {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [newDate, setNewDate] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setHolidays(HolidayService.getHolidays(userId));
    setNewDate(getTodayDateString('Asia/Kolkata'));
  }, [userId]);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) return;

    HolidayService.addHoliday(userId, {
      date: newDate,
      name: newName.trim(),
      isCustom: true,
    });

    const updated = HolidayService.getHolidays(userId);
    setHolidays(updated);
    setNewName('');
    setStatusMsg(`Added holiday: "${newName.trim()}" on ${formatDisplayDate(newDate)}`);
    onHolidaysChange?.();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleRemoveHoliday = (dateStr: string, name: string) => {
    HolidayService.removeHoliday(userId, dateStr);
    const updated = HolidayService.getHolidays(userId);
    setHolidays(updated);
    setStatusMsg(`Removed holiday: "${name}"`);
    onHolidaysChange?.();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Sort holidays chronologically
  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Holidays & Days Off</h3>
            <p className="text-xs text-slate-400">
              Configure public holidays and planned breaks to skip routine schedules and mute alarms
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
          {sortedHolidays.length} Days Registered
        </span>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-slate-800 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Add Holiday Form */}
      <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
        <div className="sm:col-span-4">
          <label htmlFor="holiday-date-input" className="block text-[11px] font-medium text-slate-400 mb-1">
            Date (YYYY-MM-DD)
          </label>
          <input
            id="holiday-date-input"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="sm:col-span-5">
          <label htmlFor="holiday-name-input" className="block text-[11px] font-medium text-slate-400 mb-1">
            Holiday / Break Name
          </label>
          <input
            id="holiday-name-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Diwali, Vacation, Family Trip..."
            required
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="sm:col-span-3 flex items-end">
          <button
            type="submit"
            className="w-full min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Day Off</span>
          </button>
        </div>
      </form>

      {/* Holidays List */}
      <div className="pt-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
          Scheduled Holidays
        </span>

        {sortedHolidays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {sortedHolidays.map((holiday) => (
              <div
                key={holiday.date}
                className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-white truncate block">{holiday.name}</span>
                    <span className="text-[11px] text-slate-400 block">{formatDisplayDate(holiday.date)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveHoliday(holiday.date, holiday.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                  title="Remove holiday"
                  aria-label={`Remove holiday ${holiday.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No holidays registered yet. Add dates above to enable 1-click day off prompts.
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400">
        💡 <strong>Weekend and Holiday Automation:</strong> On any weekend or registered holiday, the timeline will intelligently prompt you to skip the complete routine.
      </div>
    </div>
  );
}
