import React from 'react';
import { CalculationResult, formatKRW, formatDuration, isWeekend } from '../utils/calculator';
import { TaxiStatus } from '../types';
import { HorseAnimation } from './HorseAnimation';
import { soundFx } from '../utils/audio';
import {
  Coffee,
  Clock,
  TrendingUp,
  Plus,
  Minus,
  Play,
  Square,
  X,
  Maximize,
  Minimize,
  ShieldAlert,
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
  const [isFullscreen, setIsFullscreen] = React.useState(!!document.fullscreenElement);

  React.useEffect(() => {
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

  const displayAmount =
    status === 'DRIVING'
      ? displayMode === 'continuous'
        ? calc.continuousEstimatedPay
        : calc.settledPay
      : 0;

  const hours = Math.floor(calc.pureWorkMinutes / 60);
  const minutes = calc.pureWorkMinutes % 60;
  const remainingSecs = calc.remainingSecondsToNextBlock;
  const remainingMin = Math.floor(remainingSecs / 60);
  const remainingSec = remainingSecs % 60;

  const breakRemMin = Math.floor(calc.breakRemainingSeconds / 60);
  const breakRemSec = calc.breakRemainingSeconds % 60;

  const weeklyLimitMinutes = weeklyLimitHours * 60;
  const isOverWeeklyLimit = weeklyLimitHours > 0 && weeklyMinutes >= weeklyLimitMinutes;

  const startTimeStr = startTimeDate
    ? startTimeDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

  const currentTimeStr = currentTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Action Buttons Block (공통 사용)
  const renderActionButtons = (isLandscapeRightCol: boolean = false) => (
    <div className={`w-full flex flex-col gap-1.5 ${isLandscapeRightCol ? 'mt-2' : ''}`}>
      {status !== 'DRIVING' ? (
        <>
          {!isWeekend(currentTime) && (
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-slate-400 font-mono">📅 평일 규정</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={isManualHoliday}
                  onChange={(e) => onToggleHoliday(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded"
                />
                <span className={isManualHoliday ? 'text-emerald-400 font-bold' : ''}>
                  오늘 공휴일
                </span>
              </label>
            </div>
          )}
          <button
            onClick={onStartShift}
            className={`w-full ${
              isLandscapeRightCol ? 'py-3' : 'py-4'
            } rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-glow-green transition-all active:scale-98 cursor-pointer`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>영 업 시 작 (주행 출발 🐎)</span>
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={onEndShift}
            className={`w-full ${
              isLandscapeRightCol ? 'py-3' : 'py-4'
            } rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-glow-red transition-all active:scale-98 cursor-pointer`}
          >
            <Square className="w-5 h-5 fill-current" />
            <span>영 업 종 료 (지불 / 정산 🧾)</span>
          </button>
          <button
            type="button"
            onClick={onCancelShift}
            className="text-[11px] text-slate-500 hover:text-rose-400 py-0.5 text-center transition"
          >
            ❌ 영업 취소 (기록 미저장)
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#06080d] text-slate-100 flex flex-col justify-between p-2.5 sm:p-5 select-none overflow-y-auto landscape:overflow-y-auto font-sans">
      {/* 1. 상단 HUD 미니 헤더 */}
      <div className="w-full max-w-lg landscape:max-w-5xl mx-auto flex items-center justify-between py-1 px-1 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-bounce">🐎</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-digital text-sm sm:text-base font-black tracking-wide text-white">
                OVERTAXED HUD
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                거치대 모드 (세로/가로)
              </span>
            </div>
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
                  실시간 연동
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 우측 전체화면 및 닫기 버튼 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition active:scale-95 cursor-pointer"
            title="전체화면 전환"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              soundFx.playBeep();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
            title="일반 모드로 복귀"
          >
            <X className="w-3.5 h-3.5" />
            <span>일반 뷰</span>
          </button>
        </div>
      </div>

      {/* 2. 메인 HUD 영역 (세로: 1열 스택 / 가로: 2열 대형 콕핏 HUD) */}
      <div className="w-full max-w-lg landscape:max-w-5xl mx-auto flex-1 flex flex-col landscape:grid landscape:grid-cols-2 landscape:gap-4 landscape:items-start my-2 landscape:my-auto min-h-0">
        {/* === 좌측 컬럼 (말 애니메이션 & 램프 & 시간 & 통행료) === */}
        <div className="flex flex-col gap-2.5">
          {/* 말 달리는 레트로 캔버스 패널 */}
          <div className="rounded-2xl border-2 border-slate-800 bg-[#090d16] p-2 sm:p-2.5 shadow-2xl relative overflow-hidden">
            <HorseAnimation
              status={status}
              isSurcharge={calc.isSurcharge}
              multiplier={calc.currentRateMultiplier}
              isBreakTime={calc.isBreakTime}
            />
          </div>

          {/* 미터기 램프 (빈차 / 주행 / 2배할증 or 휴게) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-black/70 rounded-xl border border-slate-800">
            <div
              className={`py-1.5 px-2 text-center rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                status === 'VACANT'
                  ? 'bg-rose-500 text-white shadow-glow-red font-black'
                  : 'bg-rose-950/20 text-rose-800/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'VACANT' ? 'bg-white' : 'bg-transparent'}`} />
              빈 차
            </div>

            {calc.isBreakTime ? (
              <div className="py-1.5 px-2 text-center rounded-lg font-bold text-xs bg-sky-500 text-black shadow-glow-green font-black flex items-center justify-center gap-1.5 animate-pulse">
                <Coffee className="w-3 h-3" />
                휴식 ({breakRemMin}분)
              </div>
            ) : (
              <div
                className={`py-1.5 px-2 text-center rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  status === 'DRIVING' && !calc.isSurcharge && !isOverWeeklyLimit
                    ? 'bg-emerald-500 text-black shadow-glow-green font-black'
                    : 'bg-emerald-950/20 text-emerald-800/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status === 'DRIVING' && !calc.isSurcharge && !isOverWeeklyLimit ? 'bg-black animate-ping' : 'bg-transparent'}`} />
                주 행
              </div>
            )}

            {isOverWeeklyLimit ? (
              <div className="py-1.5 px-2 text-center rounded-lg font-bold text-[11px] bg-rose-600 text-white shadow-glow-red animate-pulse flex items-center justify-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                무급 봉사
              </div>
            ) : (
              <div
                className={`py-1.5 px-2 text-center rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  status === 'DRIVING' && calc.isSurcharge
                    ? 'bg-amber-400 text-black shadow-glow-amber animate-pulse font-black'
                    : 'bg-amber-950/20 text-amber-800/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status === 'DRIVING' && calc.isSurcharge ? 'bg-red-600 animate-ping' : 'bg-transparent'}`} />
                할증 (200%)
              </div>
            )}
          </div>

          {/* 하단 2단 요약 정보 (인정시간 & 기준시급) */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 rounded-xl p-2 sm:p-2.5 border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  야근 인정 시간
                </span>
                {startTimeStr && <span>시작 {startTimeStr}</span>}
              </div>
              <div className="text-lg sm:text-xl font-bold text-cyan-300 font-digital tracking-tight mt-1">
                {hours}시간 {minutes}분
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-2 sm:p-2.5 border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span>기준 시급</span>
                <span className={calc.isSurcharge ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {calc.currentRateMultiplier.toFixed(1)}x
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-100 font-digital tracking-tight mt-1">
                ₩{formatKRW(hourlyRate)}
              </div>
            </div>
          </div>

          {/* 통행료 컨트롤 (주행 중일 때) */}
          {status === 'DRIVING' && onAdd30Min && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black text-[10px] border border-amber-500/30">
                  통행료
                </span>
                <span className="text-xs text-amber-200 font-bold">야근 30분 앞당기기</span>
                {calc.manualBonusBlocks > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-black">
                    +{calc.manualBonusBlocks * 30}분
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {calc.manualBonusBlocks > 0 && onSub30Min && (
                  <button
                    type="button"
                    onClick={onSub30Min}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onAdd30Min}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs flex items-center gap-1 shadow-glow-amber active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  +30분 당김
                </button>
              </div>
            </div>
          )}
        </div>

        {/* === 우측 컬럼 (대형 7세그 LED 요금 + 카운트다운 게이지 + 가로모드 액션버튼) === */}
        <div className="flex flex-col gap-2.5 mt-2.5 landscape:mt-0">
          {/* 초대형 7세그먼트 LED 요금판 */}
          <div className="relative rounded-2xl bg-[#03150b] border-2 border-emerald-900/80 p-3.5 sm:p-5 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#00ff66 1.5px, transparent 1.5px)',
                backgroundSize: '10px 10px',
              }}
            />

            <div className="w-full flex justify-between items-center text-xs font-mono text-emerald-500/80 mb-1 z-10">
              <span className="font-bold tracking-wider">TAXI FARE</span>
              <span className="flex items-center gap-1">
                {status === 'DRIVING' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
                {calc.isBreakTime
                  ? '☕ 의무 휴식 (요금 정지)'
                  : isOverWeeklyLimit
                  ? '주간 한도 초과'
                  : calc.isSurcharge
                  ? '심야할증 2.0x'
                  : status === 'DRIVING'
                  ? '정규야근 1.5x'
                  : '대기'}
              </span>
            </div>

            {/* 초대형 금액 표시 */}
            <div className="z-10 flex items-baseline justify-center gap-2 my-1 sm:my-2">
              <span className="text-2xl sm:text-3xl font-digital text-emerald-500 font-bold">₩</span>
              <span
                className={`font-digital text-5xl sm:text-6xl landscape:text-5xl lg:text-6xl tracking-tight font-black transition-all ${
                  calc.isBreakTime
                    ? 'text-sky-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.7)]'
                    : isOverWeeklyLimit && stopPayOnLimit
                    ? 'text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]'
                    : calc.isSurcharge
                    ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(255,170,0,0.7)]'
                    : 'text-meter-neonGreen drop-shadow-[0_0_20px_rgba(0,255,102,0.7)]'
                }`}
              >
                {formatKRW(displayAmount)}
              </span>
            </div>

            <div className="w-full flex justify-between items-center text-xs font-mono text-emerald-400/90 mt-1 z-10 border-t border-emerald-950/80 pt-1.5">
              <span>확정 정산액: ₩{formatKRW(calc.settledPay)}</span>
              <span>{calc.settledBlocks * 30}분 인정 ({calc.settledBlocks}구간)</span>
            </div>
          </div>

          {/* 30분 카운트다운 게이지 바 (주행 중) */}
          {status === 'DRIVING' && !calc.isBreakTime && (
            <div className="bg-slate-900/90 rounded-xl p-2.5 sm:p-3 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  다음 인상 ({new Date(calc.nextBlockTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })})
                </span>
                <span className="text-emerald-400 font-bold font-digital text-sm">
                  {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')} 남음
                </span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-2.5 sm:h-3 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    calc.isSurcharge
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-glow-amber'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-glow-green'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, calc.currentBlockProgress * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* 휴식 중 배너 */}
          {status === 'DRIVING' && calc.isBreakTime && (
            <div className="p-2.5 sm:p-3 bg-sky-950/40 border border-sky-400/50 rounded-xl flex items-center justify-between text-xs font-mono text-sky-200">
              <span className="font-bold flex items-center gap-1.5 text-sky-300">
                <Coffee className="w-4 h-4 text-sky-400 animate-bounce" />
                법정 30분 의무 휴식 중
              </span>
              <span className="font-bold text-sky-400 text-sm font-digital">
                {String(breakRemMin).padStart(2, '0')}:{String(breakRemSec).padStart(2, '0')} 남음
              </span>
            </div>
          )}

          {/* 가로 모드일 때 우측 컬럼에 액션 버튼 배치 */}
          <div className="hidden landscape:block">
            {renderActionButtons(true)}
          </div>
        </div>
      </div>

      {/* 3. 하단 대형 조작 버튼 영역 (세로 모드에서만 표시, 가로 모드에서는 우측 컬럼에 표시) */}
      <div className="w-full max-w-lg mx-auto shrink-0 flex flex-col gap-2 pt-1 landscape:hidden">
        {renderActionButtons(false)}
        <div className="text-center text-[10px] text-slate-500 font-mono">
          💡 아이폰 거치대에 세로/가로로 올려두고 실시간 야근 수당을 모니터링하세요.
        </div>
      </div>
    </div>
  );
};
