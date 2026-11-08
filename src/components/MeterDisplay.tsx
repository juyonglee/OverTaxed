import React from 'react';
import { CalculationResult, formatKRW, formatDuration } from '../utils/calculator';
import { TaxiStatus } from '../types';
import { Clock, TrendingUp, AlertTriangle, Plus, Minus, ShieldAlert, Coffee } from 'lucide-react';

interface MeterDisplayProps {
  status: TaxiStatus;
  calc: CalculationResult;
  displayMode: 'stepped' | 'continuous';
  hourlyRate: number;
  currentDisplayTime: Date;
  startTimeDate?: Date | null;
  dailyLimitHours?: number;
  weeklyMinutes: number;
  weeklyLimitHours: number;
  stopPayOnLimit: boolean;
  enforceBreakTime: boolean;
  onOpenSettings?: () => void;
  onAdd30Min?: () => void;
  onSub30Min?: () => void;
  horseSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
}

export const MeterDisplay: React.FC<MeterDisplayProps> = ({
  status,
  calc,
  displayMode,
  hourlyRate,
  currentDisplayTime,
  startTimeDate,
  dailyLimitHours = 0,
  weeklyMinutes,
  weeklyLimitHours,
  stopPayOnLimit,
  enforceBreakTime,
  onAdd30Min,
  onSub30Min,
  horseSlot,
  actionSlot,
}) => {
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

  const nextTargetTimeStr = calc.nextBlockTime
    ? new Date(calc.nextBlockTime).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

  const startTimeStr = startTimeDate
    ? startTimeDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

  const weeklyLimitMinutes = weeklyLimitHours * 60;
  const isOverWeeklyLimit = weeklyLimitHours > 0 && weeklyMinutes >= weeklyLimitMinutes;
  const remainingWeeklyMinutes = Math.max(0, weeklyLimitMinutes - weeklyMinutes);
  const weeklyProgress = weeklyLimitMinutes > 0 ? Math.min(100, (weeklyMinutes / weeklyLimitMinutes) * 100) : 0;

  // 1. 미터기 상단 인디케이터 램프
  const lampsElement = (
    <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/60 rounded-xl border border-slate-800 shrink-0">
      <div
        className={`py-1.5 px-2 text-center rounded-lg font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 ${
          status === 'VACANT'
            ? 'bg-rose-500 text-white shadow-glow-red'
            : 'bg-rose-950/20 text-rose-800/40'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${status === 'VACANT' ? 'bg-white' : 'bg-transparent'}`} />
        빈 차
      </div>

      {calc.isBreakTime ? (
        <div className="py-1.5 px-2 text-center rounded-lg font-bold text-xs bg-sky-500 text-black shadow-glow-green font-black flex items-center justify-center gap-1.5 animate-pulse">
          <Coffee className="w-3 h-3" />
          휴식 (동결)
        </div>
      ) : (
        <div
          className={`py-1.5 px-2 text-center rounded-lg font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 ${
            status === 'DRIVING' && !calc.isSurcharge && !isOverWeeklyLimit && !calc.isDailyLimitReached
              ? 'bg-emerald-500 text-black shadow-glow-green font-black'
              : 'bg-emerald-950/20 text-emerald-800/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${status === 'DRIVING' && !calc.isSurcharge && !isOverWeeklyLimit && !calc.isDailyLimitReached ? 'bg-black animate-ping' : 'bg-transparent'}`} />
          주 행
        </div>
      )}

      {isOverWeeklyLimit || (calc.isDailyLimitReached && stopPayOnLimit) ? (
        <div className="py-1.5 px-2 text-center rounded-lg font-bold text-[11px] bg-rose-600 text-white shadow-glow-red animate-pulse flex items-center justify-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          꽁짜 노동🚨
        </div>
      ) : (
        <div
          className={`py-1.5 px-2 text-center rounded-lg font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 ${
            status === 'DRIVING' && calc.isSurcharge
              ? 'bg-amber-400 text-black shadow-glow-amber animate-pulse font-black'
              : 'bg-amber-950/20 text-amber-800/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${status === 'DRIVING' && calc.isSurcharge ? 'bg-red-600 animate-ping' : 'bg-transparent'}`} />
          할 증 (2배)
        </div>
      )}
    </div>
  );

  // 2. 대형 LED 메인 요금 디스플레이
  const ledElement = (
    <div className="relative rounded-xl bg-meter-ledBg border-2 border-emerald-950 p-4 shadow-inner flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#00ff66 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }}
      />
      <div className="w-full flex justify-between items-center text-xs font-mono text-emerald-600/70 mb-1 z-10">
        <span>FARE / 수당</span>
        <span className="flex items-center gap-1">
          {status === 'DRIVING' && !calc.isBreakTime && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
          {calc.isBreakTime
            ? '☕ 4시간 휴식 (요금 동결 중)'
            : calc.isDailyLimitReached && stopPayOnLimit
            ? '🚨 1일 한도(4시간) 도달 (꽁짜 노동)'
            : isOverWeeklyLimit
            ? '주간 한도 초과 (열정페이)'
            : calc.isSurcharge
            ? '심야/휴일연장 200%'
            : status === 'DRIVING'
            ? '기본 야근 150%'
            : '영업 정지'}
        </span>
      </div>

      <div className="z-10 flex items-baseline justify-center gap-2 my-1">
        <span className="text-xl sm:text-2xl font-digital text-emerald-500 font-bold">₩</span>
        <span
          className={`font-digital text-5xl sm:text-6xl tracking-tight font-black transition-all ${
            calc.isBreakTime
              ? 'text-sky-300 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]'
              : (isOverWeeklyLimit || calc.isDailyLimitReached) && stopPayOnLimit
              ? 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]'
              : calc.isSurcharge
              ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(255,170,0,0.6)]'
              : 'text-meter-neonGreen drop-shadow-[0_0_15px_rgba(0,255,102,0.6)]'
          }`}
        >
          {formatKRW(displayAmount)}
        </span>
      </div>

      <div className="w-full flex justify-between items-center text-[11px] font-mono text-emerald-500/80 mt-1 z-10">
        <span>확정 정산액: ₩{formatKRW(calc.settledPay)}</span>
        <span>
          {calc.settledBlocks * 30}분 인정 ({calc.settledBlocks}구간
          {calc.breakDeductedMinutes > 0 ? ` / ☕휴식-${calc.breakDeductedMinutes}분` : ''})
        </span>
      </div>
    </div>
  );

  // 3. ☕ 4시간 의무 휴식시간 배너
  const breakBannerElement = status === 'DRIVING' && calc.isBreakTime && (
    <div className="p-3 bg-sky-950/50 border border-sky-400/60 rounded-xl flex flex-col gap-1.5 text-xs font-mono text-sky-200 shadow-md">
      <div className="flex justify-between items-center">
        <span className="font-bold flex items-center gap-1.5 text-sky-300">
          <Coffee className="w-4 h-4 text-sky-400 animate-bounce" />
          법정 30분 의무 휴게시간 (요금 동결 중)
        </span>
        <span className="font-bold text-sky-300">
          {String(breakRemMin).padStart(2, '0')}:{String(breakRemSec).padStart(2, '0')} 남음
        </span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className="h-full bg-sky-400 transition-all duration-1000"
          style={{ width: `${Math.min(100, Math.max(0, (calc.breakRemainingSeconds / 1800) * 100))}%` }}
        />
      </div>
      <p className="text-[11px] text-sky-200/90 leading-relaxed">
        ☕ 4시간 근무로 30분간 야근비와 인정시간이 <strong>완전 동결</strong>됩니다. 현재 근무는 <strong>회사를 위한 꽁짜 노동(무료 봉사)</strong>으로 실시간 집계됩니다!
      </p>
    </div>
  );

  // 3-1. 🚨 1일 야근 한도(4시간) 도달 배너
  const dailyLimitBannerElement = status === 'DRIVING' && calc.isDailyLimitReached && stopPayOnLimit && !calc.isBreakTime && (
    <div className="p-3 bg-rose-950/50 border border-rose-500/60 rounded-xl flex flex-col gap-1 text-xs font-mono text-rose-200 shadow-md">
      <div className="flex justify-between items-center font-bold text-rose-300">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          1일 최대 야근 한도(4시간) 도달
        </span>
        <span className="text-rose-400">요금 동결</span>
      </div>
      <p className="text-[11px] text-rose-200/80 mt-0.5">
        1일 연장근로 한도(4시간)를 채웠습니다. 지금부터의 모든 추가 근무는 100% 꽁짜 노동(무급 봉사)으로 기록됩니다!
      </p>
    </div>
  );

  // 3-2. ❤️ 꽁짜 노동 (무료 봉사) 실시간 누적 박스
  const unpaidElement = status === 'DRIVING' && calc.unpaidMinutes > 0 && (
    <div className="p-2.5 sm:p-3 bg-gradient-to-r from-slate-900 to-rose-950/40 border border-rose-500/40 rounded-xl flex items-center justify-between gap-2 shadow-sm font-mono text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <div className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-black text-xs border border-rose-500/30 whitespace-nowrap shrink-0 flex items-center gap-1">
          ❤️ 꽁짜 노동
        </div>
        <div className="text-slate-300 font-bold truncate">
          <span>{formatDuration(calc.unpaidMinutes)}</span>
          {calc.breakDeductedMinutes > 0 && (
            <span className="text-[10px] text-rose-300/80 font-normal ml-1">
              (휴게 {calc.breakDeductedMinutes}분)
            </span>
          )}
        </div>
      </div>
      <div className="text-rose-400 font-bold whitespace-nowrap text-right">
        약 ₩{formatKRW(calc.unpaidAmount)} 기부 중 😭
      </div>
    </div>
  );

  // 4. 30분 시계 기준 카운트다운 게이지 바
  const countdownElement = status === 'DRIVING' && !calc.isBreakTime && (
    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="text-slate-400 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          다음 인상 시각: <strong className="text-slate-200">{nextTargetTimeStr}</strong>
        </span>
        <span className="text-emerald-400 font-bold">
          {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')} 남음
        </span>
      </div>

      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isOverWeeklyLimit && stopPayOnLimit
              ? 'bg-rose-500'
              : calc.isSurcharge
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-glow-amber'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-glow-green'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, calc.currentBlockProgress * 100))}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
        <span>
          {isOverWeeklyLimit && stopPayOnLimit
            ? '주간 한도 도달로 추가 수당 없음'
            : `+${formatKRW(Math.round((hourlyRate * calc.currentRateMultiplier) / 2))}원 인상 예정`}
        </span>
        <span>{Math.round(calc.currentBlockProgress * 100)}%</span>
      </div>
    </div>
  );

  // 5. 🛡️ 주간 야근 한도 게이지
  const weeklyLimitElement = weeklyLimitHours > 0 && (
    <div
      className={`p-3 rounded-xl border flex flex-col gap-1.5 font-mono text-xs transition ${
        isOverWeeklyLimit
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          : 'bg-slate-900/80 border-slate-800 text-slate-300'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="flex items-center gap-1 font-bold">
          {isOverWeeklyLimit ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          )}
          {isOverWeeklyLimit ? '🚨 주간 한도 초과 (일요일 0시 리셋)' : '주간 인정 한도 (일요일 0시 리셋)'}
        </span>
        <span className="font-bold text-[11px]">
          {formatDuration(weeklyMinutes)} / {weeklyLimitHours}시간
        </span>
      </div>

      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverWeeklyLimit
              ? 'bg-rose-500 shadow-glow-red'
              : weeklyProgress > 80
              ? 'bg-amber-400'
              : 'bg-cyan-500'
          }`}
          style={{ width: `${Math.min(100, weeklyProgress)}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400">
        <span>
          {isOverWeeklyLimit
            ? '초과근무 한도 도달! 지금부터는 무료 봉사입니다 😭'
            : `수당 인정 잔여: ${formatDuration(remainingWeeklyMinutes)} 남음`}
        </span>
        <span>{Math.round(weeklyProgress)}%</span>
      </div>
    </div>
  );

  // 6. 🚀 '통행료 추가' 바
  const tollBarElement = status === 'DRIVING' && onAdd30Min && (
    <div
      className="flex items-center justify-between p-2.5 sm:p-3 bg-gradient-to-r from-slate-900 to-amber-950/30 border border-amber-500/40 rounded-xl gap-2 shadow-sm"
      title="야근 중 늦게 켰을 때 누르면 시작 시각이 30분 전으로 당겨집니다."
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30 whitespace-nowrap shrink-0">
          통행료
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-amber-200 whitespace-nowrap">
            야근 30분 앞당기기
          </span>
          {calc.manualBonusBlocks > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-black whitespace-nowrap">
              +{calc.manualBonusBlocks * 30}분 당김
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {calc.manualBonusBlocks > 0 && onSub30Min && (
          <button
            type="button"
            onClick={onSub30Min}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 border border-slate-700 transition active:scale-95 whitespace-nowrap cursor-pointer"
            title="30분 원복"
          >
            <Minus className="w-3 h-3" />
            취소
          </button>
        )}
        <button
          type="button"
          onClick={onAdd30Min}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs flex items-center gap-1 shadow-glow-amber transition active:scale-95 whitespace-nowrap cursor-pointer"
          title="30분치 수당 즉시 추가 & 시작 시각 30분 전으로 이동"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          통행료 (+30분)
        </button>
      </div>
    </div>
  );

  // 7. 📊 하단 시간 & 시급 정보 패널
  const infoPanelElement = (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
      <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800 flex flex-col justify-between gap-1">
        <div className="flex justify-between items-center text-slate-400 text-[11px]">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
            야근 인정 시간
          </span>
          {calc.isBreakTime ? (
            <span className="text-[10px] text-sky-400 font-bold whitespace-nowrap">
              ☕ 휴식 중 동결
            </span>
          ) : (calc.isDailyLimitReached && stopPayOnLimit) ? (
            <span className="text-[10px] text-rose-400 font-bold whitespace-nowrap">
              🔒 4시간 한도 정지
            </span>
          ) : startTimeStr ? (
            <span className="text-[10px] text-slate-500 whitespace-nowrap">
              시작 {startTimeStr}
            </span>
          ) : null}
        </div>

        <div className="text-xl sm:text-2xl font-bold text-cyan-300 font-digital tracking-tight">
          {hours}시간 {minutes}분
        </div>

        <div className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap truncate pt-0.5 border-t border-slate-800/80">
          {enforceBreakTime && status === 'DRIVING' ? (
            calc.isBreakTime ? (
              <span className="text-sky-300 font-bold flex items-center gap-1">
                <Coffee className="w-3 h-3 shrink-0" />
                4시간 의무 휴식 중 (인정시간 정지)
              </span>
            ) : (calc.isDailyLimitReached && stopPayOnLimit) ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                1일 한도({dailyLimitHours}시간) 도달로 꽁짜 노동 중
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Coffee className="w-3 h-3 text-sky-400 shrink-0" />
                {formatDuration(calc.minutesUntilNextBreak)} 후 30분 휴식
              </span>
            )
          ) : calc.manualBonusBlocks > 0 ? (
            <span className="text-amber-400">
              +{calc.manualBonusBlocks * 30}분 당김 적용됨
            </span>
          ) : (
            <span className="text-slate-500">정상 주행 중</span>
          )}
        </div>
      </div>

      <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800 flex flex-col justify-between gap-1">
        <div className="flex justify-between items-center text-slate-400 text-[11px]">
          <span className="whitespace-nowrap">기준 시급</span>
          <span className="text-[10px] text-slate-500 whitespace-nowrap">
            현재 {currentDisplayTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-slate-100 font-digital tracking-tight">
          ₩{formatKRW(hourlyRate)}
        </div>

        <div className="text-[10px] text-slate-400 flex items-center justify-between whitespace-nowrap pt-0.5 border-t border-slate-800/80">
          <span className={calc.isSurcharge ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
            {calc.isSurcharge ? '심야할증 200%' : '정규야근 150%'}
          </span>
          <span className="text-slate-500 font-mono text-[9px]">
            {calc.currentRateMultiplier.toFixed(1)}x 적용
          </span>
        </div>
      </div>
    </div>
  );

  // 8. 준비중 안내
  const preparingAlertElement = status === 'PREPARING' && (
    <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <div className="font-bold text-amber-300">평일 야근 준비중</div>
        <p className="text-[11px] text-amber-200/70 mt-0.5">
          평일 규정에 따라 20:00부터 영업 시작이 가능합니다. (상단 공휴일 체크 또는 테스트 모드 시 언제든 시작 가능)
        </p>
      </div>
    </div>
  );

  // horseSlot과 actionSlot이 제공된 경우: 세로 모드(단일 컬럼) vs 가로 모드(좌우 균형 2열) 반응형 렌더링
  if (horseSlot && actionSlot) {
    return (
      <div className="w-full">
        {/* 모바일 세로 뷰: 오리지널 단일 1열 미터기 */}
        <div className="flex flex-col gap-3.5 md:hidden">
          {horseSlot}
          <div className="relative w-full rounded-2xl bg-gradient-to-b from-meter-card to-meter-dark border-2 border-slate-700/80 p-4 shadow-2xl flex flex-col gap-3.5">
            {lampsElement}
            {ledElement}
            {breakBannerElement}
            {dailyLimitBannerElement}
            {unpaidElement}
            {countdownElement}
            {weeklyLimitElement}
            {tollBarElement}
            {infoPanelElement}
            {preparingAlertElement}
          </div>
          {actionSlot}
        </div>

        {/* 데스크탑 / 가로(Landscape) 뷰: 좌우 높이가 1:1로 완벽하게 균형 잡힌 2열 콕핏 */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:items-start">
          {/* [좌측 컬럼]: 말 달리기 + 램프 + 인정시간/시급 + 꽁짜노동 + 통행료 + 주간한도 */}
          <div className="flex flex-col gap-3.5">
            {horseSlot}
            <div className="rounded-2xl bg-gradient-to-b from-meter-card to-meter-dark border-2 border-slate-700/80 p-4 shadow-2xl flex flex-col gap-3.5">
              {lampsElement}
              {infoPanelElement}
              {unpaidElement}
              {tollBarElement}
              {weeklyLimitElement}
              {preparingAlertElement}
            </div>
          </div>

          {/* [우측 컬럼]: 대형 LED 요금판 + 카운트다운 + 휴식배너/한도배너 + 대형 액션 버튼 */}
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl bg-gradient-to-b from-meter-card to-meter-dark border-2 border-slate-700/80 p-4 shadow-2xl flex flex-col gap-3.5">
              {ledElement}
              {countdownElement}
              {breakBannerElement}
              {dailyLimitBannerElement}
            </div>
            {actionSlot}
          </div>
        </div>
      </div>
    );
  }

  // 기본 단일 컬럼 모드 (독립 렌더링 시)
  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-meter-card to-meter-dark border-2 border-slate-700/80 p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5">
      {lampsElement}
      {ledElement}
      {breakBannerElement}
      {dailyLimitBannerElement}
      {unpaidElement}
      {countdownElement}
      {weeklyLimitElement}
      {tollBarElement}
      {infoPanelElement}
      {preparingAlertElement}
    </div>
  );
};
