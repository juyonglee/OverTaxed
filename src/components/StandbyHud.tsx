import React, { useState, useEffect } from 'react';
import { CalculationResult, isWeekend } from '../utils/calculator';
import { TaxiStatus } from '../types';
import { HorseAnimation } from './HorseAnimation';
import { MeterDisplay } from './MeterDisplay';
import { soundFx } from '../utils/audio';
import {
  Play,
  Square,
  X,
  Maximize,
  Minimize,
  Zap,
} from 'lucide-react';

interface StandbyHudProps {
  status: TaxiStatus;
  calc: CalculationResult;
  displayMode: 'stepped' | 'continuous';
  hourlyRate: number;
  currentTime: Date;
  startTimeDate: Date | null;
  weeklyMinutes: number;
  weeklyLimitHours: number;
  stopPayOnLimit: boolean;
  enforceBreakTime: boolean;
  isCloudSynced: boolean;
  useGoogleSheets: boolean;
  isWakeLockActive: boolean;
  isManualHoliday: boolean;
  onToggleHoliday: (val: boolean) => void;
  onStartShift: () => void;
  onEndShift: () => void;
  onCancelShift: () => void;
  onAdd30Min?: () => void;
  onSub30Min?: () => void;
  onClose: () => void;
}

export const StandbyHud: React.FC<StandbyHudProps> = ({
  status,
  calc,
  displayMode,
  hourlyRate,
  currentTime,
  startTimeDate,
  weeklyMinutes,
  weeklyLimitHours,
  stopPayOnLimit,
  enforceBreakTime,
  isCloudSynced,
  useGoogleSheets,
  isWakeLockActive,
  isManualHoliday,
  onToggleHoliday,
  onStartShift,
  onEndShift,
  onCancelShift,
  onAdd30Min,
  onSub30Min,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    soundFx.playBeep();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const currentTimeStr = currentTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-slate-100 flex flex-col justify-between p-3 sm:p-5 select-none overflow-y-auto font-sans">
      {/* 1. 최상단 미니멀 네비게이션 헤더 */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 px-1 border-b border-slate-800/80 shrink-0 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-bounce">🐎</span>
          <div>
            <h1 className="font-digital text-base font-black tracking-wide text-white flex items-center gap-1.5">
              <span>야근 미터기</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                거치대 HUD
              </span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span>{currentTimeStr}</span>
              {isWakeLockActive && (
                <span className="text-amber-400 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  화면 켜짐 유지
                </span>
              )}
              {useGoogleSheets && isCloudSynced && (
                <span className="text-sky-400 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  동기화됨
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 우측 컨트롤: 전체화면 & 닫기 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition active:scale-95 cursor-pointer"
            title="전체화면 전환"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              soundFx.playBeep();
              onClose();
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
            title="일반 뷰로 복귀"
          >
            <X className="w-3.5 h-3.5" />
            <span>닫기</span>
          </button>
        </div>
      </header>

      {/* 2. 메인 미터기 본체 영역 (정중앙 1열 일체형 클래식 미터기) */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center gap-3.5 my-auto min-h-0 py-1">
        {/* 말 달리는 레트로 픽셀 애니메이션 패널 */}
        <HorseAnimation
          status={status}
          isSurcharge={calc.isSurcharge}
          multiplier={calc.currentRateMultiplier}
          isBreakTime={calc.isBreakTime}
          height={95}
        />

        {/* 레트로 택시 미터기 본체 디스플레이 (LED + 게이지 + 통행료 + 인정시간) */}
        <MeterDisplay
          status={status}
          calc={calc}
          displayMode={displayMode}
          hourlyRate={hourlyRate}
          currentDisplayTime={currentTime}
          startTimeDate={startTimeDate}
          weeklyMinutes={weeklyMinutes}
          weeklyLimitHours={weeklyLimitHours}
          stopPayOnLimit={stopPayOnLimit}
          enforceBreakTime={enforceBreakTime}
          onOpenSettings={() => {}}
          onAdd30Min={onAdd30Min}
          onSub30Min={onSub30Min}
        />

        {/* 대형 조작 버튼 (영업 시작 / 영업 종료) */}
        <div className="w-full flex flex-col gap-2 mt-1">
          {status !== 'DRIVING' ? (
            <>
              {!isWeekend(currentTime) && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-slate-400 font-mono">📅 평일 규정</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={isManualHoliday}
                      onChange={(e) => onToggleHoliday(e.target.checked)}
                      className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className={isManualHoliday ? 'text-emerald-400 font-bold' : ''}>
                      오늘 공휴일(대체공휴일)
                    </span>
                  </label>
                </div>
              )}
              <button
                onClick={onStartShift}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-base flex items-center justify-center gap-2 shadow-glow-green transition-all active:scale-98 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>영 업 시 작 (주행 출발 🐎)</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={onEndShift}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow-red transition-all active:scale-98 cursor-pointer"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>영 업 종 료 (지불 / 정산 🧾)</span>
              </button>
              <button
                type="button"
                onClick={onCancelShift}
                className="text-xs text-slate-500 hover:text-rose-400 py-1 text-center transition flex items-center justify-center gap-1 cursor-pointer"
              >
                ❌ 잘못 시작했나요? (기록 없이 영업 취소)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. 하단 미니멀 안내 팁 */}
      <footer className="w-full max-w-md mx-auto text-center text-[10px] text-slate-500 font-mono pt-1 shrink-0">
        야근 미터기 OverTaxed • 실시간 야근 수당 계산
      </footer>
    </div>
  );
};
