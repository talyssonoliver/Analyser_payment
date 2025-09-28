'use client';

interface DailyEntry {
  id: number;
  date: string;
  day: string;
  consignments: number;
  baseAmount: number;
  totalPay: number;
  pickups?: number;
  earlyArrive?: number;
  attendanceBonus?: number;
  unloadingBonus?: number;
}

interface EntryCardsProps {
  entries: DailyEntry[];
  onEditEntry: (entryId: number) => void;
}

export function EntryCards({ entries, onEditEntry }: EntryCardsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-UK', options);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📅</span>
        </div>
        <p className="text-slate-600">No manual entries yet. Add your first day to get started.</p>
      </div>
    );
  }

  return (
    <div className="manual-entries-display">
      <h3 className="entries-title text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span className="text-2xl">📋</span>
        Your Daily Entries
      </h3>
      <div className="manual-entries-list space-y-4 max-h-64 overflow-y-auto pr-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="step2-entry-card bg-gradient-to-br from-white to-slate-50 rounded-xl p-5 hover:from-slate-50 hover:to-slate-100 transition-all duration-300 cursor-pointer border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transform hover:scale-102 hover:-translate-y-1 group relative overflow-hidden"
            onClick={() => onEditEntry(entry.id)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Animated border highlight */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 blur-sm transition-all duration-300" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex-1">
                <div className="entry-header flex items-center justify-between mb-3">
                  <div className="entry-date">
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-300">
                      {formatDate(entry.date)}
                    </h4>
                    <span className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors duration-300 flex items-center gap-1">
                      <span className="w-2 h-2 bg-current rounded-full opacity-50" />
                      {entry.day}
                    </span>
                  </div>
                  <div className="entry-total">
                    <div className="text-right">
                      <div className="text-2xl font-black text-green-600 group-hover:text-green-700 transition-all duration-300 group-hover:scale-105">
                        {formatCurrency(entry.totalPay)}
                      </div>
                      <div className="text-xs text-slate-500 font-medium tracking-wider uppercase">
                        Total Pay
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="entry-breakdown mt-4 pt-3 border-t border-slate-200 group-hover:border-slate-300 transition-colors duration-300">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="breakdown-item bg-slate-50 rounded-lg p-2 group-hover:bg-white group-hover:shadow-sm transition-all duration-300">
                      <span className="breakdown-label text-slate-600 block text-xs uppercase tracking-wide font-semibold">Consignments</span>
                      <span className="breakdown-value font-bold text-slate-900 text-sm block mt-1">{entry.consignments}</span>
                    </div>
                    <div className="breakdown-item bg-slate-50 rounded-lg p-2 group-hover:bg-white group-hover:shadow-sm transition-all duration-300">
                      <span className="breakdown-label text-slate-600 block text-xs uppercase tracking-wide font-semibold">Base Pay</span>
                      <span className="breakdown-value font-bold text-slate-900 text-sm block mt-1">{formatCurrency(entry.baseAmount)}</span>
                    </div>
                    {entry.pickups && entry.pickups > 0 && (
                      <div className="breakdown-item bg-slate-50 rounded-lg p-2 group-hover:bg-white group-hover:shadow-sm transition-all duration-300">
                        <span className="breakdown-label text-slate-600 block text-xs uppercase tracking-wide font-semibold">Pickups</span>
                        <span className="breakdown-value font-bold text-slate-900 text-sm block mt-1">{entry.pickups}</span>
                      </div>
                    )}
                    {entry.earlyArrive && entry.earlyArrive > 0 && (
                      <div className="breakdown-item bg-green-50 rounded-lg p-2 group-hover:bg-green-100 group-hover:shadow-sm transition-all duration-300 border border-green-200">
                        <span className="breakdown-label text-green-600 block text-xs uppercase tracking-wide font-semibold">Early Bonus</span>
                        <span className="breakdown-value font-bold text-green-700 text-sm block mt-1">{formatCurrency(entry.earlyArrive)}</span>
                      </div>
                    )}
                    {entry.attendanceBonus && entry.attendanceBonus > 0 && (
                      <div className="breakdown-item bg-green-50 rounded-lg p-2 group-hover:bg-green-100 group-hover:shadow-sm transition-all duration-300 border border-green-200">
                        <span className="breakdown-label text-green-600 block text-xs uppercase tracking-wide font-semibold">Attendance</span>
                        <span className="breakdown-value font-bold text-green-700 text-sm block mt-1">{formatCurrency(entry.attendanceBonus)}</span>
                      </div>
                    )}
                    {entry.unloadingBonus && entry.unloadingBonus > 0 && (
                      <div className="breakdown-item bg-blue-50 rounded-lg p-2 group-hover:bg-blue-100 group-hover:shadow-sm transition-all duration-300 border border-blue-200">
                        <span className="breakdown-label text-blue-600 block text-xs uppercase tracking-wide font-semibold">Unloading</span>
                        <span className="breakdown-value font-bold text-blue-700 text-sm block mt-1">{formatCurrency(entry.unloadingBonus)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Edit Indicator */}
              <div className="ml-4 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>

                {/* Floating edit icon */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 animate-ping" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Scroll Indicator (if needed) */}
      {entries.length > 3 && (
        <div className="text-center mt-2">
          <p className="text-xs text-slate-500">💡 Click any entry to edit • Scroll for more entries</p>
        </div>
      )}
    </div>
  );
}