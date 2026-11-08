import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, ShiftRecord, TaxiStatus } from './types';
import {
  calculateOvertimePay,
  isWeekdayBeforeOpening,
  isWeekend,
  getSundayStartOfWeek,
  getPrevClock30Min,
  CalculationResult,
} from './utils/calculator';
import { soundFx } from './utils/audio';
import { syncRecordToGoogleSheets } from './utils/googleSheets';
import { HorseAnimation } from './components/HorseAnimation';
import { MeterDisplay } from './components/MeterDisplay';
import { ReceiptModal } from './components/ReceiptModal';
import { HistoryStats } from './components/HistoryStats';
import { SettingsModal } from './components/SettingsModal';
import {
  Play,
  Square,
  Settings as SettingsIcon,
  Receipt,
  Car,
  Sparkles,
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 19610, // 기본 시급 19,610원
  soundEnabled: true,
  soundSettings: {
    master: true,
    buttonBeep: true,
    settlementSound: 'both', // 'neigh' | 'cash' | 'both'
    surchargeAlarm: true,
    breakAlarm: true,
    receiptPrint: true,
  },
  useGoogleSheets: false,
  googleScriptUrl: '',
  displayMode: 'continuous',
  testMode: false,
  weeklyLimitHours: 12, // 기본 주 12시간 연장근로 한도
  stopPayOnLimitReached: true, // 한도 초과 시 무급 봉사 모드
  enforceBreakTime: true, // 4시간마다 30분 의무 휴식
};

export const App: React.FC = () => {
  // 1. 상태 관리
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('overtaxed_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [records, setRecords] = useState<ShiftRecord[]>(() => {
    const saved = localStorage.getItem('overtaxed_records');
    return saved ? JSON.parse(saved) : [];
  });

  // 현재 진행 중인 야근 세션
  const [activeShift, setActiveShift] = useState<{
    startTime: string;
    originalStartTime?: string; // 처음 버튼 누른 진짜 원래 시각
    isHoliday: boolean;
    manualBonusBlocks?: number;
  } | null>(() => {
    const saved = localStorage.getItem('overtaxed_active_shift');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && !parsed.originalStartTime) {
        // 기존 세션에 originalStartTime이 없으면 역산 보정
        parsed.originalStartTime = new Date(
          new Date(parsed.startTime).getTime() + (parsed.manualBonusBlocks || 0) * 30 * 60 * 1000
        ).toISOString();
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // 탭 상태: 'meter' | 'stats'
  const [activeTab, setActiveTab] = useState<'meter' | 'stats'>('meter');

  // 모달 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<ShiftRecord | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isManualHoliday, setIsManualHoliday] = useState<boolean>(false);

  // 시계 및 실시간 계산 결과
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const prevSettledBlocksRef = useRef<number>(0);
  const prevSurchargeRef = useRef<boolean>(false);
  const prevBreakTimeRef = useRef<boolean>(false);

  // 사운드 세부 설정 동기화
  useEffect(() => {
    if (settings.soundSettings) {
      soundFx.updateSettings(settings.soundSettings);
    } else {
      soundFx.setEnabled(settings.soundEnabled);
    }
  }, [settings.soundSettings, settings.soundEnabled]);

  // 로컬스토리지 동기화
  useEffect(() => {
    localStorage.setItem('overtaxed_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('overtaxed_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (activeShift) {
      localStorage.setItem('overtaxed_active_shift', JSON.stringify(activeShift));
    } else {
      localStorage.removeItem('overtaxed_active_shift');
    }
  }, [activeShift]);

  // 가상 시각 또는 실제 시각 계산
  const getEffectiveCurrentTime = useCallback(() => {
    const now = new Date();
    if (settings.testMode && settings.simulatedHour !== undefined) {
      const simulated = new Date();
      simulated.setHours(settings.simulatedHour, 35, 0, 0);
      return simulated;
    }
    return now;
  }, [settings.testMode, settings.simulatedHour]);

  // 화면 복귀(모바일 화면 켜짐/앱 전환) 시 즉시 시간 동기화
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCurrentTime(getEffectiveCurrentTime());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getEffectiveCurrentTime]);

  // 1초마다 시계 갱신 및 요금 인상 체크
  useEffect(() => {
    const timer = setInterval(() => {
      const now = getEffectiveCurrentTime();
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [getEffectiveCurrentTime]);

  // 현재 택시 상태 계산
  const effectiveNow = getEffectiveCurrentTime();
  const isWeekendNow = isWeekend(effectiveNow) || isManualHoliday;
  const isWeekdayPreOpen = !isWeekendNow && isWeekdayBeforeOpening(effectiveNow);

  let taxiStatus: TaxiStatus = 'VACANT';
  if (activeShift) {
    taxiStatus = 'DRIVING';
  } else if (isWeekdayPreOpen && !settings.testMode) {
    taxiStatus = 'PREPARING';
  }

  // 일요일 00:00:00 기준 이번 주 누적 완료된 야근 시간(분) 계산
  const sundayStart = getSundayStartOfWeek(effectiveNow).getTime();
  const priorWeeklyMinutes = records
    .filter((r) => new Date(r.startTime).getTime() >= sundayStart)
    .reduce((sum, r) => sum + r.settledMinutes, 0);

  // 실시간 야근 수당 계산
  const currentCalc: CalculationResult = activeShift
    ? calculateOvertimePay(
        new Date(activeShift.startTime),
        effectiveNow,
        settings.hourlyRate,
        activeShift.isHoliday,
        activeShift.manualBonusBlocks || 0,
        priorWeeklyMinutes,
        (settings.weeklyLimitHours || 0) * 60,
        settings.stopPayOnLimitReached,
        settings.enforceBreakTime !== false
      )
    : {
        totalMinutes: 0,
        pureWorkMinutes: 0,
        settledBlocks: 0,
        currentBlockProgress: 0,
        remainingSecondsToNextBlock: 0,
        nextBlockTime: new Date(),
        currentRateMultiplier: isWeekendNow ? 1.5 : (effectiveNow.getHours() >= 22 || effectiveNow.getHours() < 8 ? 2.0 : 1.5),
        isSurcharge: !isWeekendNow && (effectiveNow.getHours() >= 22 || effectiveNow.getHours() < 8),
        normalOvertimeMinutes: 0,
        nightOvertimeMinutes: 0,
        settledPay: 0,
        continuousEstimatedPay: 0,
        manualBonusBlocks: 0,
        isWeeklyLimitReached: (settings.weeklyLimitHours || 0) > 0 && priorWeeklyMinutes >= (settings.weeklyLimitHours || 0) * 60,
        isBreakTime: false,
        breakRemainingSeconds: 0,
        minutesUntilNextBreak: 240,
        breakDeductedMinutes: 0,
      };

  // 이번 주 총 야근 시간 (이전 완료 + 현재 주행)
  const totalWeeklyMinutes = priorWeeklyMinutes + currentCalc.totalMinutes;

  // 30분 단위 요금 인상, 4시간 휴게시간, 2배 할증 진입 사운드 트리거
  useEffect(() => {
    if (taxiStatus === 'DRIVING') {
      // 30분 블록 증가 시 (말 울음소리 / 돈 짤랑 소리)
      if (currentCalc.settledBlocks > prevSettledBlocksRef.current) {
        soundFx.playSettlementSound();
        prevSettledBlocksRef.current = currentCalc.settledBlocks;
      }
      // 4시간 휴게시간 진입 시 차임벨
      if (currentCalc.isBreakTime && !prevBreakTimeRef.current) {
        soundFx.playBreakChime();
      }
      prevBreakTimeRef.current = currentCalc.isBreakTime;

      // 2배 할증 진입 시 경보음
      if (currentCalc.isSurcharge && !prevSurchargeRef.current) {
        soundFx.playSurchargeAlarm();
      }
      prevSurchargeRef.current = currentCalc.isSurcharge;
    } else {
      prevSettledBlocksRef.current = 0;
      prevSurchargeRef.current = false;
      prevBreakTimeRef.current = false;
    }
  }, [taxiStatus, currentCalc.settledBlocks, currentCalc.isSurcharge, currentCalc.isBreakTime]);

  // [영업 취소 (기록 없이 리셋)] 핸들러
  const handleCancelShift = () => {
    if (!activeShift) return;
    if (confirm('현재 주행 중인 야근을 저장하지 않고 취소하시겠습니까?')) {
      soundFx.playBeep();
      setActiveShift(null);
    }
  };

  // [영업 시작] 핸들러
  const handleStartShift = () => {
    soundFx.playStartDrive();
    const startTimeDate = getEffectiveCurrentTime();
    const isHoliday = isWeekend(startTimeDate) || isManualHoliday;

    setActiveShift({
      startTime: startTimeDate.toISOString(),
      originalStartTime: startTimeDate.toISOString(),
      isHoliday,
      manualBonusBlocks: 0,
    });
  };

  // 수동 30분 추가 (시계 기준 00분 / 30분 정각으로 스냅하여 앞당김!)
  const handleManualAdd30Min = () => {
    if (!activeShift) return;
    soundFx.playSettlementSound();

    // originalStartTime이 없으면 (구버전 데이터) 현재 시각 또는 현재 startTime 역산으로 안전하게 설정
    const origTimeStr =
      activeShift.originalStartTime ||
      new Date(
        new Date(activeShift.startTime).getTime() +
          (activeShift.manualBonusBlocks || 0) * 30 * 60 * 1000
      ).toISOString();

    const origTime = new Date(origTimeStr);
    const prevBoundary = getPrevClock30Min(origTime);
    const nextBonus = (activeShift.manualBonusBlocks || 0) + 1;
    // prevBoundary에서 (nextBonus * 30분) 전 정각으로 스냅
    const snappedStartTime = new Date(
      prevBoundary.getTime() - nextBonus * 30 * 60 * 1000
    ).toISOString();

    setActiveShift((prev) =>
      prev
        ? {
            ...prev,
            originalStartTime: origTimeStr,
            startTime: snappedStartTime,
            manualBonusBlocks: nextBonus,
          }
        : null
    );
  };

  // 수동 30분 차감 (취소 시 이전 정각 또는 원래 시각으로 100% 복원)
  const handleManualSub30Min = () => {
    if (!activeShift || !activeShift.manualBonusBlocks) return;
    soundFx.playBeep();

    const origTimeStr =
      activeShift.originalStartTime ||
      new Date(
        new Date(activeShift.startTime).getTime() +
          (activeShift.manualBonusBlocks || 0) * 30 * 60 * 1000
      ).toISOString();

    const nextBonus = activeShift.manualBonusBlocks - 1;

    if (nextBonus <= 0) {
      // 0회가 되면 원래 켰던 시각으로 100% 완전 원복!
      setActiveShift((prev) =>
        prev
          ? {
              ...prev,
              originalStartTime: origTimeStr,
              startTime: origTimeStr,
              manualBonusBlocks: 0,
            }
          : null
      );
    } else {
      const origTime = new Date(origTimeStr);
      const prevBoundary = getPrevClock30Min(origTime);
      const snappedStartTime = new Date(
        prevBoundary.getTime() - nextBonus * 30 * 60 * 1000
      ).toISOString();

      setActiveShift((prev) =>
        prev
          ? {
              ...prev,
              originalStartTime: origTimeStr,
              startTime: snappedStartTime,
              manualBonusBlocks: nextBonus,
            }
          : null
      );
    }
  };

  // [영업 종료] 핸들러
  const handleEndShift = async () => {
    if (!activeShift) return;

    soundFx.playReceiptPrint();
    const endTimeDate = getEffectiveCurrentTime();
    const finalCalc = calculateOvertimePay(
      new Date(activeShift.startTime),
      endTimeDate,
      settings.hourlyRate,
      activeShift.isHoliday,
      activeShift.manualBonusBlocks || 0,
      priorWeeklyMinutes,
      (settings.weeklyLimitHours || 0) * 60,
      settings.stopPayOnLimitReached,
      settings.enforceBreakTime !== false
    );

    const newRecord: ShiftRecord = {
      id: 'shift-' + Date.now(),
      date: new Date(activeShift.startTime).toISOString().split('T')[0],
      startTime: activeShift.startTime,
      endTime: endTimeDate.toISOString(),
      isWeekendOrHoliday: activeShift.isHoliday,
      hourlyRate: settings.hourlyRate,
      totalMinutes: finalCalc.totalMinutes,
      settledMinutes: finalCalc.settledBlocks * 30,
      normalOvertimeMinutes: finalCalc.normalOvertimeMinutes,
      nightOvertimeMinutes: finalCalc.nightOvertimeMinutes,
      breakDeductedMinutes: finalCalc.breakDeductedMinutes,
      totalPay: finalCalc.settledPay,
      manualBonusBlocks: activeShift.manualBonusBlocks || 0,
      syncedToGoogleSheet: false,
    };

    // 구글 시트 자동 동기화 시도
    if (settings.useGoogleSheets && settings.googleScriptUrl) {
      setSyncStatus({ success: false, message: 'Google 시트 저장 중...' });
      const syncRes = await syncRecordToGoogleSheets(settings.googleScriptUrl, newRecord);
      newRecord.syncedToGoogleSheet = syncRes.success;
      setSyncStatus(syncRes);
    } else {
      setSyncStatus(null);
    }

    // 기록 저장 및 세션 초기화
    setRecords((prev) => [newRecord, ...prev]);
    setActiveShift(null);

    // 영수증 모달 오픈
    setReceiptRecord(newRecord);
    setIsReceiptOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0d12] text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 font-sans">
      {/* 최상단 네비게이션 헤더 */}
      <header className="w-full max-w-md flex items-center justify-between py-2 px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-bounce">🐎</span>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 font-digital">
              <span>야근 미터기</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                OverTaxed
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              실시간 야근 수당 계산 & Google Sheets 연동
            </p>
          </div>
        </div>

        {/* 우측 퀵 버튼 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              soundFx.playBeep();
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition active:scale-95"
            title="환경 설정"
          >
            <SettingsIcon className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 (미터기 주행 vs 수당 장부) */}
      <div className="w-full max-w-md grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-4">
        <button
          onClick={() => {
            soundFx.playBeep();
            setActiveTab('meter');
          }}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'meter'
              ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          택시 미터기
        </button>
        <button
          onClick={() => {
            soundFx.playBeep();
            setActiveTab('stats');
          }}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'stats'
              ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          수당 장부 & 통계
          {records.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
              {records.length}
            </span>
          )}
        </button>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <main className="w-full max-w-md flex flex-col gap-4">
        {activeTab === 'meter' ? (
          <>
            {/* 1. 말 달리는 레트로 픽셀 애니메이션 패널 */}
            <HorseAnimation
              status={taxiStatus}
              isSurcharge={currentCalc.isSurcharge}
              multiplier={currentCalc.currentRateMultiplier}
              isBreakTime={currentCalc.isBreakTime}
            />

            {/* 2. 레트로 택시 미터기 대형 디스플레이 */}
            <MeterDisplay
              status={taxiStatus}
              calc={currentCalc}
              displayMode={settings.displayMode}
              hourlyRate={settings.hourlyRate}
              currentDisplayTime={currentTime}
              startTimeDate={activeShift ? new Date(activeShift.startTime) : null}
              weeklyMinutes={totalWeeklyMinutes}
              weeklyLimitHours={settings.weeklyLimitHours || 0}
              stopPayOnLimit={settings.stopPayOnLimitReached}
              enforceBreakTime={settings.enforceBreakTime !== false}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onAdd30Min={handleManualAdd30Min}
              onSub30Min={handleManualSub30Min}
            />

            {/* 3. 대형 조작 레버 (영업 시작 / 영업 종료) */}
            <div className="w-full flex flex-col gap-2 mt-1">
              {taxiStatus !== 'DRIVING' && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-slate-400 font-mono">
                    {isWeekend(effectiveNow) ? '📅 주말 규정 자동 적용' : '📅 평일 규정 적용 중'}
                  </span>
                  {!isWeekend(effectiveNow) && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-white transition">
                      <input
                        type="checkbox"
                        checked={isManualHoliday}
                        onChange={(e) => setIsManualHoliday(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                      />
                      <span className={isManualHoliday ? 'text-emerald-400 font-bold' : ''}>
                        오늘 공휴일(대체공휴일)
                      </span>
                    </label>
                  )}
                </div>
              )}

              {taxiStatus !== 'DRIVING' ? (
                <button
                  onClick={handleStartShift}
                  disabled={taxiStatus === 'PREPARING' && !settings.testMode}
                  className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-98 ${
                    taxiStatus === 'PREPARING' && !settings.testMode
                      ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black shadow-glow-green cursor-pointer'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>영 업 시 작 (주행 출발 🐎)</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleEndShift}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow-red transition-all active:scale-98 cursor-pointer"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>영 업 종 료 (지불 / 정산 🧾)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelShift}
                    className="text-xs text-slate-500 hover:text-rose-400 py-1 text-center transition flex items-center justify-center gap-1"
                  >
                    ❌ 잘못 시작했나요? (기록 없이 영업 취소)
                  </button>
                </div>
              )}

              {/* 하단 보조 안내 팁 */}
              <div className="text-center text-[11px] text-slate-500 font-mono mt-1">
                {taxiStatus === 'DRIVING' ? (
                  <span className="text-emerald-400 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    야근비가 30분 단위로 정산 및 누적되고 있습니다.
                  </span>
                ) : (
                  <span>
                    평일은 20:00부터, 주말/공휴일은 언제든 영업 시작이 가능합니다.
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          /* 통계 및 장부 탭 */
          <HistoryStats
            records={records}
            onDeleteRecord={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
            onClearAll={() => setRecords([])}
            googleScriptUrl={settings.googleScriptUrl}
          />
        )}
      </main>

      {/* 설정 모달 */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newSettings) => setSettings(newSettings)}
      />

      {/* 영수증 모달 */}
      <ReceiptModal
        record={receiptRecord}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onDelete={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
        syncStatus={syncStatus}
      />
    </div>
  );
};

export default App;

