export interface CalculationResult {
  totalMinutes: number; // 총 경과 분
  pureWorkMinutes: number; // 휴식시간 제외한 순수 근무 분
  settledBlocks: number; // 30분 단위 블록 수
  currentBlockProgress: number; // 현재 30분 블록의 진행률 (0 ~ 1)
  remainingSecondsToNextBlock: number; // 다음 30분(정각 or 30분) 요금 인상까지 남은 초
  nextBlockTime: Date; // 다음 요금 인상 시각 (예: 16:30, 17:00)
  currentRateMultiplier: number; // 현재 시점의 배율 (1.5 or 2.0)
  isSurcharge: boolean; // 2.0배 할증 여부
  normalOvertimeMinutes: number; // 1.5배 구간 분 (정산 기준)
  nightOvertimeMinutes: number; // 2.0배 구간 분 (정산 기준)
  settledPay: number; // 30분 단위로 확정된 정산 야근비
  continuousEstimatedPay: number; // 초단위 실시간 미터기 예상 수당
  manualBonusBlocks: number; // 수동으로 추가된 30분 블록 수
  isWeeklyLimitReached?: boolean; // 주간 한도 초과 여부
  isBreakTime: boolean; // 현재 30분 휴식시간 중인지 여부
  breakRemainingSeconds: number; // 휴식 종료까지 남은 초
  minutesUntilNextBreak: number; // 다음 30분 휴식까지 남은 분
  breakDeductedMinutes: number; // 휴식으로 제외된 총 분
  unpaidMinutes: number; // 30분 단위 못 채운 자투리 무료 봉사 분
  unpaidAmount: number; // 무료 봉사 환산액 (원)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0), 토요일(6)
}

/**
 * 평일 20시 이전인지 확인 (영업 준비중 여부)
 */
export function isWeekdayBeforeOpening(now: Date): boolean {
  if (isWeekend(now)) return false;
  const hours = now.getHours();
  return hours < 20 && hours >= 6; // 새벽 퇴근 고려: 아침 6시부터 저녁 8시 전까지는 영업 준비중
}

/**
 * 일요일 기준 이번 주 시작 시각(일요일 00:00:00) 구하기
 */
export function getSundayStartOfWeek(referenceDate: Date): Date {
  const sunday = new Date(referenceDate);
  const day = sunday.getDay(); // 0 is Sunday
  sunday.setDate(sunday.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * 다음 시계 기준 30분 정각(:00 or :30)을 계산
 */
export function getNextClock30Min(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  if (minutes < 30) {
    next.setMinutes(30);
  } else {
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
  }
  return next;
}

/**
 * 이전 시계 기준 30분 정각(:00 or :30)을 계산
 */
export function getPrevClock30Min(date: Date): Date {
  const prev = new Date(date);
  prev.setSeconds(0, 0);
  const minutes = prev.getMinutes();
  if (minutes < 30) {
    prev.setMinutes(0);
  } else {
    prev.setMinutes(30);
  }
  return prev;
}

/**
 * 시계 기준(:00, :30) 및 4시간 30분 휴게시간 야근비 계산 엔진
 */
export function calculateOvertimePay(
  startTime: Date,
  currentTime: Date,
  hourlyRate: number,
  isHolidayMode: boolean = false,
  manualBonusBlocks: number = 0,
  weeklyPriorMinutes: number = 0, // 이번 주 기존 누적 야근 분
  weeklyLimitMinutes: number = 0, // 주간 한도 (0이면 무제한)
  stopPayOnLimit: boolean = false,
  enforceBreakTime: boolean = true // 4시간마다 30분 휴식 적용
): CalculationResult {
  const startMs = startTime.getTime();
  const currentMs = currentTime.getTime();
  const elapsedMs = Math.max(0, currentMs - startMs);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);

  // ☕ 4시간(240분)마다 30분 휴식시간 판정
  // 1주기 = 240분 근무 + 30분 휴식 = 270분 (4.5시간)
  let isBreakTime = false;
  let breakRemainingSeconds = 0;
  let minutesUntilNextBreak = 240;
  let breakDeductedMinutes = 0;

  if (enforceBreakTime && totalMinutes > 0) {
    const cycleMinutes = 270;
    const cycleSeconds = cycleMinutes * 60;
    const currentCycleSeconds = totalSeconds % cycleSeconds;
    const workLimitSeconds = 240 * 60; // 4시간 (14,400초)

    // 전체 지난 완료 사이클 수
    const fullCycles = Math.floor(totalSeconds / cycleSeconds);
    breakDeductedMinutes = fullCycles * 30;

    if (currentCycleSeconds >= workLimitSeconds) {
      // 4시간 근무 초과 후 30분 휴식 구간 진입!
      isBreakTime = true;
      breakRemainingSeconds = cycleSeconds - currentCycleSeconds;
      minutesUntilNextBreak = 0;
      breakDeductedMinutes += Math.floor((currentCycleSeconds - workLimitSeconds) / 60);
    } else {
      // 아직 4시간 근무 중
      isBreakTime = false;
      minutesUntilNextBreak = Math.ceil((workLimitSeconds - currentCycleSeconds) / 60);
    }
  }

  const pureWorkMinutes = Math.max(0, totalMinutes - breakDeductedMinutes);

  // 시계 기준 다음 30분 인상 시각 (:00 또는 :30)
  const nextBlockTime = getNextClock30Min(currentTime);
  const prevBlockTime = getPrevClock30Min(currentTime);

  const blockTotalSeconds = Math.floor((nextBlockTime.getTime() - prevBlockTime.getTime()) / 1000);
  const remainingSecondsToNextBlock = Math.max(
    0,
    Math.floor((nextBlockTime.getTime() - currentMs) / 1000)
  );
  const currentBlockSeconds = Math.max(0, blockTotalSeconds - remainingSecondsToNextBlock);
  const currentBlockProgress = Math.min(1, Math.max(0, currentBlockSeconds / blockTotalSeconds));

  const isWeekendShift = isHolidayMode || isWeekend(startTime);

  let clockCrossedBlocks = 0;
  let cursor = getNextClock30Min(startTime);

  while (cursor.getTime() <= currentMs) {
    clockCrossedBlocks++;
    cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
  }

  // 휴식 시간(30분 단위)은 정산 블록에서 제외
  const breakBlocks = Math.floor(breakDeductedMinutes / 30);
  const settledBlocks = Math.max(0, clockCrossedBlocks - breakBlocks);

  let settledPay = 0;
  let normalOvertimeMinutes = 0;
  let nightOvertimeMinutes = 0;

  for (let i = 0; i < settledBlocks; i++) {
    // 주간 한도 체크
    const blockCumulativeMinutes = weeklyPriorMinutes + (i + 1) * 30;
    const isExceedingLimit = weeklyLimitMinutes > 0 && blockCumulativeMinutes > weeklyLimitMinutes;

    const blockTime = new Date(cursor.getTime() - (settledBlocks - i) * 30 * 60 * 1000);
    let multiplier = 1.5;

    if (isWeekendShift) {
      if (i >= 16) {
        multiplier = 2.0;
        nightOvertimeMinutes += 30;
      } else {
        multiplier = 1.5;
        normalOvertimeMinutes += 30;
      }
    } else {
      const blockHour = blockTime.getHours();
      const isNight = blockHour >= 22 || blockHour < 8;
      if (isNight) {
        multiplier = 2.0;
        nightOvertimeMinutes += 30;
      } else {
        multiplier = 1.5;
        normalOvertimeMinutes += 30;
      }
    }

    // 한도 초과 시 무급 봉사면 0원 처리
    if (stopPayOnLimit && isExceedingLimit) {
      // 0원
    } else {
      const blockAmount = Math.round((hourlyRate * multiplier) / 2);
      settledPay += blockAmount;
    }
  }

  const nowHour = currentTime.getHours();
  let currentMultiplier = 1.5;
  if (isWeekendShift) {
    currentMultiplier = settledBlocks >= 16 ? 2.0 : 1.5;
  } else {
    currentMultiplier = nowHour >= 22 || nowHour < 8 ? 2.0 : 1.5;
  }

  // 주간 한도 도달 여부
  const currentTotalWeekMinutes = weeklyPriorMinutes + pureWorkMinutes;
  const isWeeklyLimitReached = weeklyLimitMinutes > 0 && currentTotalWeekMinutes >= weeklyLimitMinutes;

  const currentBlockAmount = (hourlyRate * currentMultiplier) / 2;
  const continuousEstimatedPay =
    isBreakTime || (stopPayOnLimit && isWeeklyLimitReached)
      ? settledPay
      : Math.round(settledPay + currentBlockAmount * currentBlockProgress);

  // 30분 단위 못 채운 자투리 무료 봉사 시간 & 환산액 계산
  const settledMinutes = settledBlocks * 30;
  const unpaidMinutes = Math.max(0, pureWorkMinutes - settledMinutes);
  const unpaidAmount = Math.round(((hourlyRate * currentMultiplier) / 60) * unpaidMinutes);

  return {
    totalMinutes,
    pureWorkMinutes,
    settledBlocks,
    currentBlockProgress: isBreakTime ? 0 : currentBlockProgress,
    remainingSecondsToNextBlock,
    nextBlockTime,
    currentRateMultiplier: currentMultiplier,
    isSurcharge: currentMultiplier >= 2.0,
    normalOvertimeMinutes,
    nightOvertimeMinutes,
    settledPay,
    continuousEstimatedPay,
    manualBonusBlocks,
    isWeeklyLimitReached,
    isBreakTime,
    breakRemainingSeconds,
    minutesUntilNextBreak,
    breakDeductedMinutes,
    unpaidMinutes,
    unpaidAmount,
  };
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  return `${hours}시간 ${mins > 0 ? `${mins}분` : ''}`.trim();
}
