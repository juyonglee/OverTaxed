export interface CalculationResult {
  totalMinutes: number; // 총 경과 분
  pureWorkMinutes: number; // 휴식시간 제외한 순수 인정 근무 분
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
  isDailyLimitReached?: boolean; // 1일 한도(4시간) 도달 여부
  isWeeklyLimitReached?: boolean; // 주간 한도 초과 여부
  isBreakTime: boolean; // 현재 30분 휴식시간 중인지 여부
  breakRemainingSeconds: number; // 휴식 종료까지 남은 초
  minutesUntilNextBreak: number; // 다음 30분 휴식까지 남은 분
  breakDeductedMinutes: number; // 휴식으로 제외된 총 분
  unpaidMinutes: number; // 자투리 + 휴식 + 한도초과 총 꽁짜 노동(무료 봉사) 분
  unpaidAmount: number; // 꽁짜 노동 환산액 (원)
}

/**
 * 안전한 Date 객체 생성 헬퍼 (Invalid Date 방지)
 */
export function safeDate(val: string | number | Date | undefined | null, fallback: Date = new Date()): Date {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
}

export function isWeekend(date: Date): boolean {
  const safeD = safeDate(date);
  const day = safeD.getDay();
  return day === 0 || day === 6; // 일요일(0), 토요일(6)
}

/**
 * 평일 20시 이전인지 확인 (영업 준비중 여부)
 */
export function isWeekdayBeforeOpening(now: Date): boolean {
  const safeNow = safeDate(now);
  if (isWeekend(safeNow)) return false;
  const hours = safeNow.getHours();
  return hours < 20 && hours >= 6; // 새벽 퇴근 고려: 아침 6시부터 저녁 8시 전까지는 영업 준비중
}

/**
 * 일요일 기준 이번 주 시작 시각(일요일 00:00:00) 구하기
 */
export function getSundayStartOfWeek(referenceDate: Date): Date {
  const sunday = new Date(safeDate(referenceDate));
  const day = sunday.getDay(); // 0 is Sunday
  sunday.setDate(sunday.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * 다음 시계 기준 30분 정각(:00 or :30)을 계산
 */
export function getNextClock30Min(date: Date): Date {
  const next = new Date(safeDate(date));
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
  const prev = new Date(safeDate(date));
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
 * 시계 기준(:00, :30) 및 4시간 30분 휴게시간 야근비 계산 엔진 (Invalid Date 100% 방어)
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
  enforceBreakTime: boolean = true, // 4시간마다 30분 휴식 적용
  dailyLimitMinutes: number = 0 // 1일 한도 분 (0이면 무제한, 240이면 4시간 한도)
): CalculationResult {
  const validStart = safeDate(startTime);
  const validCurrent = safeDate(currentTime);

  const startMs = validStart.getTime();
  const currentMs = validCurrent.getTime();
  const elapsedMs = Math.max(0, currentMs - startMs);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);

  // ☕ 4시간(240분)마다 30분 의무 휴게시간 판정
  let isBreakTime = false;
  let breakRemainingSeconds = 0;
  let minutesUntilNextBreak = 240;
  let breakDeductedMinutes = 0;

  if (enforceBreakTime && totalMinutes > 0) {
    const cycleMinutes = 270; // 240분 근무 + 30분 휴식
    const cycleSeconds = cycleMinutes * 60;
    const currentCycleSeconds = totalSeconds % cycleSeconds;
    const workLimitSeconds = 240 * 60;

    const fullCycles = Math.floor(totalSeconds / cycleSeconds);
    breakDeductedMinutes = fullCycles * 30;

    if (currentCycleSeconds >= workLimitSeconds) {
      isBreakTime = true;
      breakRemainingSeconds = cycleSeconds - currentCycleSeconds;
      minutesUntilNextBreak = 0;
      // 휴식시간 동안 경과한 초를 분으로 환산하여 공제 (최대 30분)
      const currentCycleBreakSeconds = currentCycleSeconds - workLimitSeconds;
      breakDeductedMinutes += Math.min(30, Math.floor(currentCycleBreakSeconds / 60));
    } else {
      isBreakTime = false;
      minutesUntilNextBreak = Math.ceil((workLimitSeconds - currentCycleSeconds) / 60);
    }
  }

  // 휴게시간을 제외한 순수 근무 시간 (휴식 중에는 240분 등으로 딱 멈춤)
  const rawWorkMinutes = Math.max(0, totalMinutes - breakDeductedMinutes);

  // 1일 인정 한도(Daily Limit) 처리 (예: 4시간 = 240분)
  let isDailyLimitReached = false;
  let dailyOverMinutes = 0;
  let pureWorkMinutes = rawWorkMinutes;

  if (dailyLimitMinutes > 0 && rawWorkMinutes >= dailyLimitMinutes) {
    isDailyLimitReached = true;
    dailyOverMinutes = rawWorkMinutes - dailyLimitMinutes;
    if (stopPayOnLimit) {
      pureWorkMinutes = dailyLimitMinutes; // 4시간 00분에서 인정시간 정지
    }
  }

  // 30분 단위 블록 계산 (순수 근무 분 기준: 휴식 중이거나 한도 초과 시 1원도 안 오름)
  const settledBlocks = Math.floor(pureWorkMinutes / 30);

  // 시계 기준 다음 30분 인상 시각 (:00 또는 :30)
  const nextBlockTime = getNextClock30Min(validCurrent);
  const prevBlockTime = getPrevClock30Min(validCurrent);

  const blockTotalSeconds = Math.max(1, Math.floor((nextBlockTime.getTime() - prevBlockTime.getTime()) / 1000));
  const remainingSecondsToNextBlock = Math.max(
    0,
    Math.floor((nextBlockTime.getTime() - currentMs) / 1000)
  );
  const currentBlockSeconds = Math.max(0, blockTotalSeconds - remainingSecondsToNextBlock);
  const currentBlockProgress = isBreakTime || (stopPayOnLimit && isDailyLimitReached)
    ? 0
    : Math.min(1, Math.max(0, currentBlockSeconds / blockTotalSeconds));

  const isWeekendShift = isHolidayMode || isWeekend(validStart);

  let settledPay = 0;
  let normalOvertimeMinutes = 0;
  let nightOvertimeMinutes = 0;

  // 각 30분 블록별 금액 정산 (시계 기준 할증 계산)
  let blockCursor = getNextClock30Min(validStart);
  for (let i = 0; i < settledBlocks; i++) {
    const blockCumulativeMinutes = weeklyPriorMinutes + (i + 1) * 30;
    const isExceedingWeeklyLimit = weeklyLimitMinutes > 0 && blockCumulativeMinutes > weeklyLimitMinutes;

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
      const blockHour = blockCursor.getHours();
      const isNight = blockHour >= 22 || blockHour < 8;
      if (isNight) {
        multiplier = 2.0;
        nightOvertimeMinutes += 30;
      } else {
        multiplier = 1.5;
        normalOvertimeMinutes += 30;
      }
    }

    if (stopPayOnLimit && isExceedingWeeklyLimit) {
      // 주간 한도 초과 시 0원
    } else {
      const blockAmount = Math.round((hourlyRate * multiplier) / 2);
      settledPay += blockAmount;
    }

    blockCursor = new Date(blockCursor.getTime() + 30 * 60 * 1000);
  }

  const nowHour = validCurrent.getHours();
  let currentMultiplier = 1.5;
  if (isWeekendShift) {
    currentMultiplier = settledBlocks >= 16 ? 2.0 : 1.5;
  } else {
    currentMultiplier = nowHour >= 22 || nowHour < 8 ? 2.0 : 1.5;
  }

  const currentTotalWeekMinutes = weeklyPriorMinutes + pureWorkMinutes;
  const isWeeklyLimitReached = weeklyLimitMinutes > 0 && currentTotalWeekMinutes >= weeklyLimitMinutes;

  // 연속 실시간 미터기 예상 수당 (휴식 중이거나 한도 초과 시 확정 수당으로 100% 동결)
  const currentBlockAmount = (hourlyRate * currentMultiplier) / 2;
  const continuousEstimatedPay =
    isBreakTime || (stopPayOnLimit && (isWeeklyLimitReached || isDailyLimitReached))
      ? settledPay
      : Math.round(settledPay + currentBlockAmount * currentBlockProgress);

  // ❤️ 꽁짜 노동(무료 봉사) 총합:
  // 1. 30분 못 채운 자투리 시간
  const remainderMinutes = Math.max(0, pureWorkMinutes - settledBlocks * 30);
  // 2. 휴게시간(근무지에 남아 일하는 30분)
  // 3. 1일 한도 초과분
  // 4. 주간 한도 초과분
  const unpaidMinutes =
    remainderMinutes +
    breakDeductedMinutes +
    dailyOverMinutes +
    (stopPayOnLimit && isWeeklyLimitReached ? Math.max(0, currentTotalWeekMinutes - weeklyLimitMinutes) : 0);

  const unpaidAmount = Math.round(((hourlyRate * currentMultiplier) / 60) * unpaidMinutes);

  return {
    totalMinutes,
    pureWorkMinutes,
    settledBlocks,
    currentBlockProgress,
    remainingSecondsToNextBlock,
    nextBlockTime,
    currentRateMultiplier: currentMultiplier,
    isSurcharge: currentMultiplier >= 2.0,
    normalOvertimeMinutes,
    nightOvertimeMinutes,
    settledPay,
    continuousEstimatedPay,
    manualBonusBlocks,
    isDailyLimitReached,
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
  if (isNaN(amount) || amount === undefined || amount === null) return '0';
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || minutes === undefined || minutes === null) return '0분';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  return `${hours}시간 ${mins > 0 ? `${mins}분` : ''}`.trim();
}
