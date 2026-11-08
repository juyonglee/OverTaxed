export interface SoundSettings {
  master: boolean; // 전체 마스터 볼륨 On/Off
  buttonBeep: boolean; // 버튼 클릭음 (삑)
  settlementSound: 'neigh' | 'cash' | 'both'; // 30분 정산음 (말 울음소리 / 동전소리 / 둘 다)
  surchargeAlarm: boolean; // 2배 심야/연장 할증 경보음
  breakAlarm: boolean; // 4시간 휴식시간 알림음
  receiptPrint: boolean; // 영수증 인쇄음
}

export interface ShiftRecord {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string
  endTime: string; // ISO string
  isWeekendOrHoliday: boolean;
  hourlyRate: number;
  totalMinutes: number; // 총 근무 분
  settledMinutes: number; // 30분 단위 정산된 분
  normalOvertimeMinutes: number; // 1.5배 구간 분
  nightOvertimeMinutes: number; // 2.0배 구간 분
  breakDeductedMinutes: number; // 4시간마다 공제된 휴식 분
  totalPay: number; // 총 야근비 (원)
  manualBonusBlocks?: number; // 수동 추가된 30분 블록 수
  syncedToGoogleSheet?: boolean;
  notes?: string;
}

export interface AppSettings {
  hourlyRate: number; // 시급 (기본 19,610)
  soundEnabled: boolean; // 하위 호환
  soundSettings: SoundSettings; // 개별 사운드 세부 설정
  useGoogleSheets: boolean; // 구글 시트 연동 여부
  googleScriptUrl: string; // 구글 앱스 스크립트 웹앱 배포 URL
  displayMode: 'stepped' | 'continuous'; // 'stepped': 30분마다 딱딱 증가 / 'continuous': 실시간 미터기처럼 부드럽게 증가
  testMode: boolean; // 시간 조작 테스트 모드 활성화 여부
  simulatedHour?: number; // 테스트용 가상 시각
  weeklyLimitHours: number; // 주간 야근 수당 인정 한도 (시간, 기본 12시간, 0이면 무제한)
  stopPayOnLimitReached: boolean; // 한도 초과 시 요금 계산 중단 (무급 봉사 모드)
  enforceBreakTime: boolean; // 4시간 근무 시 30분 휴식시간 의무 적용
}

export type TaxiStatus = 'VACANT' | 'DRIVING' | 'PREPARING'; // 빈차 / 주행중 / 영업준비(평일 20시 이전)
