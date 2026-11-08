import React, { useState, useMemo } from 'react';
import { ShiftRecord } from '../types';
import { formatKRW, formatDuration } from '../utils/calculator';
import { Calendar, Trash2, ArrowUpRight, DollarSign, Clock, Layers, Filter } from 'lucide-react';

interface HistoryStatsProps {
  records: ShiftRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  googleScriptUrl?: string;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

export const HistoryStats: React.FC<HistoryStatsProps> = ({
  records,
  onDeleteRecord,
  onClearAll,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 날짜 필터링 로직
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return records.filter((r) => {
      const recordDate = new Date(r.date);
      if (period === 'today') {
        return r.date === todayStr;
      }
      if (period === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return recordDate >= oneWeekAgo;
      }
      if (period === 'month') {
        return (
          recordDate.getFullYear() === now.getFullYear() &&
          recordDate.getMonth() === now.getMonth()
        );
      }
      if (period === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const recordTime = recordDate.getTime();
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;
        return recordTime >= start && recordTime <= end;
      }
      return true; // 'all'
    });
  }, [records, period, customStartDate, customEndDate]);

  // 합계 통계 계산
  const stats = useMemo(() => {
    const totalPay = filteredRecords.reduce((sum, r) => sum + r.totalPay, 0);
    const totalMinutes = filteredRecords.reduce((sum, r) => sum + r.settledMinutes, 0);
    const normalMinutes = filteredRecords.reduce((sum, r) => sum + r.normalOvertimeMinutes, 0);
    const nightMinutes = filteredRecords.reduce((sum, r) => sum + r.nightOvertimeMinutes, 0);
    const shiftCount = filteredRecords.length;

    return {
      totalPay,
      totalMinutes,
      normalMinutes,
      nightMinutes,
      shiftCount,
    };
  }, [filteredRecords]);

  // CSV 다운로드 기능
  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('내보낼 야근 기록이 없습니다.');
      return;
    }

    const headers = [
      '일자',
      '시작시간',
      '종료시간',
      '근무구분',
      '기준시급',
      '정산시간(분)',
      '일반야근(1.5x)',
      '심야/휴일연장(2.0x)',
      '최종야근수당(원)',
    ];

    const rows = filteredRecords.map((r) => [
      r.date,
      new Date(r.startTime).toLocaleTimeString('ko-KR', { hour12: false }),
      new Date(r.endTime).toLocaleTimeString('ko-KR', { hour12: false }),
      r.isWeekendOrHoliday ? '주말/공휴일' : '평일야근',
      r.hourlyRate,
      r.settledMinutes,
      r.normalOvertimeMinutes,
      r.nightOvertimeMinutes,
      r.totalPay,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `야근수당장부_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 기간 필터 탭 */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex gap-1 overflow-x-auto">
          {(
            [
              { key: 'today', label: '오늘' },
              { key: 'week', label: '이번 주' },
              { key: 'month', label: '이번 달' },
              { key: 'all', label: '전체' },
              { key: 'custom', label: '직접 선택' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                period === tab.key
                  ? 'bg-emerald-500 text-black shadow-glow-green font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CSV 내보내기 버튼 */}
        <button
          onClick={exportToCSV}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          CSV 백업
        </button>
      </div>

      {/* 커스텀 날짜 선택기 */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs"
          />
          <span className="text-slate-500">~</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs"
          />
        </div>
      )}

      {/* 종합 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* 총 정산 수당 */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-emerald-400/80 font-mono flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            선택 기간 총 수당
          </span>
          <div className="mt-2">
            <span className="text-2xl font-digital font-black text-emerald-400">
              ₩{formatKRW(stats.totalPay)}
            </span>
            <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
              총 {stats.shiftCount}회 야근
            </span>
          </div>
        </div>

        {/* 누적 야근 시간 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            총 정산 시간
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold text-cyan-300">
              {formatDuration(stats.totalMinutes)}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              30분 단위 정산 합산
            </span>
          </div>
        </div>

        {/* 심야 2배 할증 비율 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            2배 할증 시간
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold text-amber-300">
              {formatDuration(stats.nightMinutes)}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              심야 및 휴일 8시간 초과
            </span>
          </div>
        </div>
      </div>

      {/* 기록 내역 리스트 */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            야근 주행 상세 내역 ({filteredRecords.length}건)
          </span>
          {records.length > 0 && (
            <button
              onClick={() => {
                if (confirm('모든 야근 기록을 삭제하시겠습니까? (로컬 기록만 삭제됩니다)')) {
                  onClearAll();
                }
              }}
              className="text-[11px] text-rose-400/70 hover:text-rose-400 transition"
            >
              전체 비우기
            </button>
          )}
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
            해당 기간에 기록된 야근 내역이 없습니다. 🐎<br />
            (영업 시작을 누르고 야근을 달려보세요!)
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredRecords.map((r) => {
              const startStr = new Date(r.startTime).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              const endStr = new Date(r.endTime).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              return (
                <div
                  key={r.id}
                  className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-xl p-3 flex items-center justify-between transition group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 font-mono">
                        {r.date}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          r.isWeekendOrHoliday
                            ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        {r.isWeekendOrHoliday ? '휴일' : '평일'}
                      </span>
                      {r.syncedToGoogleSheet && (
                        <span className="text-[10px] text-emerald-400 font-mono">● 시트연동</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                      <span>{startStr} ~ {endStr}</span>
                      <span>•</span>
                      <span>{formatDuration(r.settledMinutes)}</span>
                      {r.nightOvertimeMinutes > 0 && (
                        <span className="text-amber-400 font-semibold text-[11px]">
                          (할증 {formatDuration(r.nightOvertimeMinutes)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-digital font-bold text-emerald-400">
                        ₩{formatKRW(r.totalPay)}
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteRecord(r.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

