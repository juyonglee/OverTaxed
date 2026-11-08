import { ShiftRecord, AppSettings } from '../types';

/**
 * [말 달리는 야근 미터기] Google Sheets & 실시간 기기 동기화 Google Apps Script 템플릿
 * 1. 스프레드시트 메뉴 > 확장 프로그램 > Apps Script 클릭
 * 2. 기존 코드를 지우고 아래 코드를 전체 붙여넣기
 * 3. 오른쪽 위 [배포] > [새 배포] 클릭
 * 4. 유형: [웹 앱] 선택
 * 5. 웹 앱에 액세스할 수 있는 사용자: [모든 사용자(Anyone)] 선택 (★필수★)
 * 6. [배포] 클릭 후 나오는 웹 앱 URL을 앱 설정에 붙여넣기!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * [말 달리는 야근 미터기] 기기 간 실시간 동기화 & 장부 저장 스크립트
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action || "SAVE_RECORD";
    var props = PropertiesService.getScriptProperties();

    // 1. 현재 주행 상태 실시간 동기화 (영업 시작 / 통행료 / 취소)
    if (action === "SYNC_ACTIVE_SHIFT") {
      if (data.activeShift) {
        props.setProperty("ACTIVE_SHIFT", JSON.stringify(data.activeShift));
      } else {
        props.deleteProperty("ACTIVE_SHIFT");
      }
      return createJsonResponse({
        status: "success",
        action: "SYNC_ACTIVE_SHIFT",
        message: "주행 상태가 클라우드에 동기화되었습니다."
      });
    }

    // 2. 영업 종료: 장부에 기록 추가 & 주행 상태 종료
    if (action === "SAVE_RECORD") {
      var sheet = getOrCreateRecordSheet();
      var record = data.record;

      var row = [
        record.id,
        record.date,
        record.startTimeStr,
        record.endTimeStr,
        record.isWeekendOrHoliday ? "주말/공휴일" : "평일야근",
        record.hourlyRate,
        record.totalMinutes,
        record.settledMinutes,
        record.normalOvertimeMinutes,
        record.nightOvertimeMinutes,
        record.breakDeductedMinutes || 0,
        record.unpaidMinutes || 0,
        record.unpaidAmount || 0,
        record.totalPay,
        record.notes || "",
        new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
      ];

      sheet.appendRow(row);

      // 주행 상태 클리어
      props.deleteProperty("ACTIVE_SHIFT");

      return createJsonResponse({
        status: "success",
        action: "SAVE_RECORD",
        message: "야근 기록이 구글 시트에 저장되고 주행이 종료되었습니다."
      });
    }

    return createJsonResponse({ status: "error", message: "알 수 없는 요청입니다." });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var activeShiftJson = props.getProperty("ACTIVE_SHIFT");
    var activeShift = activeShiftJson ? JSON.parse(activeShiftJson) : null;

    // 최근 야근 기록 목록 조회
    var records = getRecentRecords(50);

    return createJsonResponse({
      status: "ok",
      activeShift: activeShift,
      records: records,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function getOrCreateRecordSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("야근장부");
  if (!sheet) {
    sheet = ss.insertSheet("야근장부", 0);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID",
      "근무일자",
      "시작시간",
      "종료시간",
      "근무구분",
      "기준시급",
      "총근무시간(분)",
      "30분정산(분)",
      "일반야근(1.5배)",
      "심야/휴일연장(2.0배)",
      "휴게공제(분)",
      "자투리무료봉사(분)",
      "무료봉사환산액(원)",
      "최종야근수당(원)",
      "비고",
      "기록시각"
    ]);
    sheet.getRange(1, 1, 1, 16).setBackground("#141821").setFontColor("#00ff66").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getRecentRecords(limit) {
  var sheet = getOrCreateRecordSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var startRow = Math.max(2, lastRow - limit + 1);
  var numRows = lastRow - startRow + 1;
  var values = sheet.getRange(startRow, 1, numRows, 16).getValues();

  var result = [];
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    result.push({
      id: row[0],
      date: typeof row[1] === "object" ? Utilities.formatDate(row[1], "Asia/Seoul", "yyyy-MM-dd") : String(row[1]),
      startTimeStr: String(row[2]),
      endTimeStr: String(row[3]),
      isWeekendOrHoliday: row[4] === "주말/공휴일",
      hourlyRate: Number(row[5]) || 0,
      totalMinutes: Number(row[6]) || 0,
      settledMinutes: Number(row[7]) || 0,
      normalOvertimeMinutes: Number(row[8]) || 0,
      nightOvertimeMinutes: Number(row[9]) || 0,
      breakDeductedMinutes: Number(row[10]) || 0,
      unpaidMinutes: Number(row[11]) || 0,
      unpaidAmount: Number(row[12]) || 0,
      totalPay: Number(row[13]) || 0,
      syncedToGoogleSheet: true
    });
  }
  return result;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * 구글 클라우드에서 실시간 주행 상태 및 기록 조회 (기기간 동기화 & Invalid Date 100% 방어)
 */
export async function fetchCloudState(scriptUrl: string): Promise<{
  success: boolean;
  activeShift: {
    startTime: string;
    originalStartTime?: string;
    isHoliday: boolean;
    manualBonusBlocks?: number;
  } | null;
  records: ShiftRecord[];
  serverTime?: string;
  message?: string;
}> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) {
    return { success: false, activeShift: null, records: [], message: 'URL 미입력' };
  }

  try {
    const res = await fetch(`${scriptUrl}?action=GET_STATE&_t=${Date.now()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    // 1. activeShift 유효성 검증 (Invalid Date 방지)
    let validatedActiveShift = null;
    if (data.activeShift && data.activeShift.startTime) {
      const parsedStart = new Date(data.activeShift.startTime);
      if (!isNaN(parsedStart.getTime())) {
        validatedActiveShift = {
          startTime: parsedStart.toISOString(),
          originalStartTime: data.activeShift.originalStartTime
            ? new Date(data.activeShift.originalStartTime).toISOString()
            : parsedStart.toISOString(),
          isHoliday: Boolean(data.activeShift.isHoliday),
          manualBonusBlocks: Number(data.activeShift.manualBonusBlocks) || 0,
        };
      }
    }

    // 2. records의 startTime, endTime 안전 복원 (Invalid Date 방지)
    const rawRecords = Array.isArray(data.records) ? data.records : [];
    const validatedRecords: ShiftRecord[] = rawRecords.map((r: any, idx: number) => {
      const dateStr = String(r.date || new Date().toISOString().split('T')[0]).trim();
      const startTimeStr = String(r.startTimeStr || '00:00:00').trim();
      const endTimeStr = String(r.endTimeStr || '00:00:00').trim();

      // startTime 안전 파싱
      let validStartTime = r.startTime;
      if (!validStartTime || isNaN(new Date(validStartTime).getTime())) {
        const timePart = startTimeStr.length === 5 ? `${startTimeStr}:00` : startTimeStr;
        const candidate = new Date(`${dateStr}T${timePart}`);
        validStartTime = isNaN(candidate.getTime()) ? new Date().toISOString() : candidate.toISOString();
      }

      // endTime 안전 파싱
      let validEndTime = r.endTime;
      if (!validEndTime || isNaN(new Date(validEndTime).getTime())) {
        const timePart = endTimeStr.length === 5 ? `${endTimeStr}:00` : endTimeStr;
        const candidate = new Date(`${dateStr}T${timePart}`);
        validEndTime = isNaN(candidate.getTime()) ? validStartTime : candidate.toISOString();
      }

      return {
        id: String(r.id || `cloud-${dateStr}-${idx}`),
        date: dateStr,
        startTime: validStartTime,
        endTime: validEndTime,
        isWeekendOrHoliday: Boolean(r.isWeekendOrHoliday),
        hourlyRate: Number(r.hourlyRate) || 19610,
        totalMinutes: Number(r.totalMinutes) || 0,
        settledMinutes: Number(r.settledMinutes) || 0,
        normalOvertimeMinutes: Number(r.normalOvertimeMinutes) || 0,
        nightOvertimeMinutes: Number(r.nightOvertimeMinutes) || 0,
        breakDeductedMinutes: Number(r.breakDeductedMinutes) || 0,
        unpaidMinutes: Number(r.unpaidMinutes) || 0,
        unpaidAmount: Number(r.unpaidAmount) || 0,
        totalPay: Number(r.totalPay) || 0,
        syncedToGoogleSheet: true,
        notes: String(r.notes || ''),
      };
    });

    return {
      success: true,
      activeShift: validatedActiveShift,
      records: validatedRecords,
      serverTime: data.serverTime,
    };
  } catch (error) {
    return {
      success: false,
      activeShift: null,
      records: [],
      message: error instanceof Error ? error.message : '동기화 연결 실패',
    };
  }
}

/**
 * 현재 주행 상태를 구글 클라우드에 실시간 동기화 (시작/통행료/취소)
 */
export async function syncActiveShiftToCloud(
  scriptUrl: string,
  activeShift: {
    startTime: string;
    originalStartTime?: string;
    isHoliday: boolean;
    manualBonusBlocks?: number;
  } | null
): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) {
    return { success: false, message: '유효한 Google Apps Script 웹 앱 URL이 아닙니다.' };
  }

  const payload = {
    action: 'SYNC_ACTIVE_SHIFT',
    activeShift,
  };

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { success: true, message: '주행 상태가 구글 클라우드에 동기화되었습니다.' };
  } catch (error) {
    return {
      success: false,
      message: `동기화 실패: ${error instanceof Error ? error.message : '오류'}`,
    };
  }
}

/**
 * Google Apps Script Web App으로 야근 기록 저장 & 주행 종료
 */
export async function syncRecordToGoogleSheets(
  scriptUrl: string,
  record: ShiftRecord
): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      message: '유효한 Google Apps Script 웹 앱 URL이 아닙니다.',
    };
  }

  const payload = {
    action: 'SAVE_RECORD',
    record: {
      ...record,
      startTimeStr: new Date(record.startTime).toLocaleTimeString('ko-KR', { hour12: false }),
      endTimeStr: new Date(record.endTime).toLocaleTimeString('ko-KR', { hour12: false }),
    },
  };

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Google 스프레드시트로 야근 기록이 저장되고 주행이 종료되었습니다.',
    };
  } catch (error) {
    return {
      success: false,
      message: `전송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}
