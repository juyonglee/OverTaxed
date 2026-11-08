import React, { useState, useEffect } from 'react';
import { CalculationResult, formatKRW, isWeekend } from '../utils/calculator';
import { TaxiStatus } from '../types';
import { HorseAnimation } from './HorseAnimation';
import { MeterDisplay } from './MeterDisplay';
import { soundFx } from '../utils/audio';
import {
  Clock,
  TrendingUp,
  Plus,
  Minus,
  Play,
  Square,
  X,
  Maximize,
  Minimize,
  Zap,
  LayoutGrid,
  Car,
  Sliders,
  Coffee,
  ShieldAlert,
} from 'lucide-react';

export type HudDisplayMode = 'classic' | 'wide' | 'mini';

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
  // 기본 모드를 'classic'으로 설정하여 친숙하고 균형 잡힌 화면 제공
  const [hudMode, setHudMode] = useState<HudDisplayMode>(() => {
    const saved = localStorage.getItem('overtaxed_hud_mode');
    return (saved as HudDisplayMode) || 'classic';
  });

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    localStorage.setItem('overtaxed_hud_mode', hudMode);
  }, [hudMode]);

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

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e] text-slate-100 flex flex-col justify-between p-3 sm:p-5 select-none overflow-y-auto font-sans">
      {/* 1. 최상단 네비게이션 헤더 */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-1.5 px-2 border-b border-slate-800/80 shrink-0 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-bounce">🐎</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-digital text-sm sm:text-base font-black tracking-wide text-white">
                OVERTAXED HUD
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                {hudMode === 'classic' ? '클래식 미터기' : hudMode === 'wide' ? '와이드 콕핏' : '미니 위젯'}
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

        {/* 중앙: 모드 전환 스위치 (클래식 미터기 / 와이드 콕핏 / 미니 위젯) */}
        <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800 gap-1">
          <button
            onClick={() => {
              soundFx.playBeep();
              setHudMode('classic');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              hudMode === 'classic'
                ? 'bg-emerald-500 text-black shadow-glow-green font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="기존 오리지널 클래식 미터기 형태"
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">클래식 미터기</span>
          </button>
          <button
            onClick={() => {
              soundFx.playBeep();
              setHudMode('wide');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              hudMode === 'wide'
                ? 'bg-emerald-500 text-black shadow-glow-green font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="좌우 1:1 완벽 대칭 와이드 콕핏"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">와이드 콕핏</span>
          </button>
          <button
            onClick={() => {
              soundFx.playBeep();
              setHudMode('mini');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              hudMode === 'mini'
                ? 'bg-emerald-500 text-black shadow-glow-green font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="구석에 띄우기 좋은 미니 바"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">미니 위젯</span>
          </button>
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
            title="일반 뷰로 복귀"
          >
            <X className="w-3.5 h-3.5" />
            <span>일반 뷰</span>
          </button>
        </div>
      </div>

      {/* 2. 메인 HUD 영역 (모드에 따라 분기) */}
      <div className="w-full flex-1 flex flex-col justify-center items-center my-auto min-h-0 py-2">
        {/* ========================================================= */}
        {/* 모드 1: [클래식 미터기] - 사용자께서 요청하신 예전 오리지널 1열 일체형 미터기! */}
        {/* ========================================================= */}
        {hudMode === 'classic' && (
          <div className="w-full max-w-md flex flex-col gap-3.5 my-auto">
            {/* 1. 말 달리는 레트로 픽셀 애니메이션 패널 */}
            <HorseAnimation
              status={status}
              isSurcharge={calc.isSurcharge}
              multiplier={calc.currentRateMultiplier}
              isBreakTime={calc.isBreakTime}
              height={95}
            />

            {/* 2. 레트로 택시 미터기 본체 디스플레이 */}
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

            {/* 3. 대형 조작 버튼 (영업 시작 / 영업 종료) */}
            <div className="w-full flex flex-col gap-2 mt-1">
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
                          className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                        />
                        <span className={isManualHoliday ? 'text-emerald-400 font-bold' : ''}>
                          오늘 공휴일
                        </span>
                      </label>
                    </div>
                  )}
                  <button
                    onClick={onStartShift}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black text-base flex items-center justify-center gap-2 shadow-glow-green transition-all active:scale-98 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>영 업 시 작 (주행 출발 🐎)</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onEndShift}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow-red transition-all active:scale-98 cursor-pointer"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>영 업 종 료 (지불 / 정산 🧾)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCancelShift}
                    className="text-xs text-slate-500 hover:text-rose-400 py-0.5 text-center transition cursor-pointer"
                  >
                    ❌ 잘못 시작했나요? (기록 없이 영업 취소)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 모드 2: [와이드 콕핏] - 넓은 모니터를 위한 좌우 1:1 완벽 수평 대칭 3단 그리드 */}
        {/* ========================================================= */}
        {hudMode === 'wide' && (
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
            {/* === 좌측 컬럼 === */}
            <div className="flex flex-col gap-3">
              {/* Row 1: 말 달리는 레트로 캔버스 (h-[165px]) */}
              <div className="h-[165px] rounded-2xl border-2 border-slate-800 bg-[#090d16] p-2.5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <HorseAnimation
                  status={status}
                  isSurcharge={calc.isSurcharge}
                  multiplier={calc.currentRateMultiplier}
                  isBreakTime={calc.isBreakTime}
                  height={100}
                />
              </div>

              {/* Row 2: 3색 인디케이터 램프 (h-[56px]) */}
              <div className="h-[56px] grid grid-cols-3 gap-2 p-1.5 bg-black/70 rounded-xl border border-slate-800 items-center">
                <div
                  className={`py-2 px-2 text-center rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    status === 'VACANT'
                      ? 'bg-rose-500 text-white shadow-glow-red font-black'
                      : 'bg-rose-950/20 text-rose-800/40'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${status === 'VACANT' ? 'bg-white' : 'bg-transparent'}`} />
                  빈 차
                </div>

                {calc.isBreakTime ? (
                  <div className="py-2 px-2 text-center rounded-lg font-bold text-xs bg-sky-500 text-black shadow-glow-green font-black flex items-center justify-center gap-1.5 animate-pulse">
                    <Coffee className="w-3.5 h-3.5" />
                    휴식 ({breakRemMin}분)
                  </div>
                ) : (
                  <div
                    className={`py-2 px-2 text-center rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
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
                  <div className="py-2 px-2 text-center rounded-lg font-bold text-[11px] bg-rose-600 text-white shadow-glow-red animate-pulse flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    무급 봉사
                  </div>
                ) : (
                  <div
                    className={`py-2 px-2 text-center rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
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

              {/* Row 3: 인정 시간 & 통행료 컨트롤러 (h-[76px]) */}
              <div className="h-[76px] grid grid-cols-2 gap-2">
                <div className="bg-slate-900/80 rounded-xl p-2 sm:p-2.5 border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400 text-[10px] font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      야근 인정 시간
                    </span>
                    {startTimeStr && <span>시작 {startTimeStr}</span>}
                  </div>
                  <div className="text-xl font-bold text-cyan-300 font-digital tracking-tight">
                    {hours}시간 {minutes}분
                  </div>
                </div>

                {status === 'DRIVING' && onAdd30Min ? (
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[10px] text-amber-200 font-mono">
                      <span className="font-bold flex items-center gap-1">
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black">
                          통행료
                        </span>
                        30분 앞당김
                      </span>
                      {calc.manualBonusBlocks > 0 && (
                        <span className="font-bold text-amber-400">+{calc.manualBonusBlocks * 30}분</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      {calc.manualBonusBlocks > 0 && onSub30Min && (
                        <button
                          type="button"
                          onClick={onSub30Min}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onAdd30Min}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs flex items-center gap-1 shadow-glow-amber active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        +30분 당김
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 rounded-xl p-2 sm:p-2.5 border border-slate-800 flex flex-col justify-between font-mono">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span>기준 시급</span>
                      <span className={calc.isSurcharge ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {calc.currentRateMultiplier.toFixed(1)}x 적용
                      </span>
                    </div>
                    <div className="text-xl font-bold text-slate-100 font-digital tracking-tight">
                      ₩{formatKRW(hourlyRate)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* === 우측 컬럼 === */}
            <div className="flex flex-col gap-3">
              {/* Row 1: 초대형 7세그먼트 LED 요금판 (h-[165px]) */}
              <div className="h-[165px] relative rounded-2xl bg-[#03150b] border-2 border-emerald-900/80 p-3 sm:p-4 shadow-2xl flex flex-col justify-between overflow-hidden">
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#00ff66 1.5px, transparent 1.5px)',
                    backgroundSize: '10px 10px',
                  }}
                />

                <div className="w-full flex justify-between items-center text-xs font-mono text-emerald-500/80 z-10">
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

                <div className="z-10 flex items-baseline justify-center gap-2 my-auto">
                  <span className="text-2xl sm:text-3xl font-digital text-emerald-500 font-bold">₩</span>
                  <span
                    className={`font-digital text-5xl sm:text-6xl tracking-tight font-black transition-all ${
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

                <div className="w-full flex justify-between items-center text-xs font-mono text-emerald-400/90 z-10 border-t border-emerald-950/80 pt-1">
                  <span>확정 정산액: ₩{formatKRW(calc.settledPay)}</span>
                  <span>{calc.settledBlocks * 30}분 인정 ({calc.settledBlocks}구간)</span>
                </div>
              </div>

              {/* Row 2: 30분 카운트다운 게이지 바 (h-[56px]) */}
              <div className="h-[56px] bg-slate-900/90 rounded-xl px-3 py-2 border border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    다음 인상 ({new Date(calc.nextBlockTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })})
                  </span>
                  <span className="text-emerald-400 font-bold font-digital text-sm">
                    {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')} 남음
                  </span>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
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

              {/* Row 3: 대형 액션 버튼 (h-[76px]) */}
              <div className="h-[76px] flex flex-col justify-center">
                {status !== 'DRIVING' ? (
                  <button
                    onClick={onStartShift}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-base flex items-center justify-center gap-2 shadow-glow-green transition-all active:scale-98 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>영 업 시 작 (주행 출발 🐎)</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={onEndShift}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow-red transition-all active:scale-98 cursor-pointer"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      <span>영 업 종 료 (지불 / 정산 🧾)</span>
                    </button>
                    <button
                      type="button"
                      onClick={onCancelShift}
                      className="text-[11px] text-slate-500 hover:text-rose-400 text-center transition cursor-pointer"
                    >
                      ❌ 잘못 시작했나요? (기록 없이 영업 취소)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 모드 3: [미니 위젯] - 화면 한구석에 작게 띄우는 초슬림 바 형태 */}
        {/* ========================================================= */}
        {hudMode === 'mini' && (
          <div className="w-full max-w-2xl bg-[#090d16] border-2 border-slate-800 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-3xl animate-bounce">🐎</span>
              <div>
                <div className="text-xs text-slate-400 font-mono">
                  {status === 'DRIVING' ? `${hours}시간 ${minutes}분 주행 중` : '영업 대기'}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {calc.isSurcharge ? '🔥 심야할증 2.0x' : '🐎 정규야근 1.5x'}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-digital text-emerald-500">₩</span>
                <span className="text-3xl sm:text-4xl font-digital font-black text-meter-neonGreen tracking-tight drop-shadow-[0_0_10px_rgba(0,255,102,0.6)]">
                  {formatKRW(displayAmount)}
                </span>
              </div>
              {status === 'DRIVING' && (
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span>다음 인상:</span>
                  <strong className="text-emerald-400 font-digital">{String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}</strong>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {status === 'DRIVING' && onAdd30Min && (
                <button
                  onClick={onAdd30Min}
                  className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-black transition active:scale-95 cursor-pointer whitespace-nowrap"
                  title="30분 앞당기기"
                >
                  +30분
                </button>
              )}

              {status !== 'DRIVING' ? (
                <button
                  onClick={onStartShift}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-glow-green transition active:scale-98 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>시작</span>
                </button>
              ) : (
                <button
                  onClick={onEndShift}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-glow-red transition active:scale-98 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>종료</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. 하단 안내 문구 */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-900/60 shrink-0">
        <span>💡 상단에서 [클래식 미터기], [와이드 콕핏], [미니 위젯] 모드를 선택할 수 있습니다.</span>
        <span>야근 미터기 OverTaxed HUD</span>
      </div>
    </div>
  );
};
