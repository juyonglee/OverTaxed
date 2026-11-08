import { ShiftRecord } from '../types';

/**
 * 사용자가 Google Apps Script에 붙여넣을 스크립트 코드
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * [말 달리는 야근 미터기] Google Sheets 자동 기록 스크립트
 * 1. 스프레드시트 메뉴 > 확장 프로그램 > Apps Script 클릭
 * 2. 기존 코드를 지우고 이 코드를 전체 붙여넣기
 * 3. 오른쪽 위 [배포] > [새 배포] 클릭
 * 4. 유형: [웹 앱] 선택
 * 5. 설명: 야근기록 연동
 * 6. 웹 앱에 액세스할 수 있는 사용자: [모든 사용자] 선택 (중요!)
 * 7. [배포] 버튼 클릭 후 표시되는 웹 앱 URL을 복사하여 앱 설정에 입력
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 시트가 비어있으면 헤더 자동 생성
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
        "심야/연장할증(2.0배)",
        "최종야근수당(원)",
        "비고",
        "기록시각"
      ]);
      // 헤더 스타일링
      sheet.getRange(1, 1, 1, 13).setBackground("#141821").setFontColor("#00ff66").setFontWeight("bold");
    }

    var data = JSON.parse(e.postData.contents);
    
    var row = [
      data.id,
      data.date,
      data.startTimeStr,
      data.endTimeStr,
      data.isWeekendOrHoliday ? "주말/공휴일" : "평일야근",
      data.hourlyRate,
      data.totalMinutes,
      data.settledMinutes,
      data.normalOvertimeMinutes,
      data.nightOvertimeMinutes,
      data.totalPay,
      data.notes || "",
      new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "야근 기록이 성공적으로 추가되었습니다."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "야근 미터기 Google Apps Script 서비스가 정상 가동 중입니다."
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Google Apps Script Web App으로 야근 기록 전송
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
    ...record,
    startTimeStr: new Date(record.startTime).toLocaleTimeString('ko-KR', { hour12: false }),
    endTimeStr: new Date(record.endTime).toLocaleTimeString('ko-KR', { hour12: false }),
  };

  try {
    // Google Apps Script 웹앱은 no-cors 혹은 302 리다이렉트를 반환하므로 POST 전송 처리
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
      message: 'Google 스프레드시트로 야근 기록이 전송되었습니다.',
    };
  } catch (error) {
    return {
      success: false,
      message: `전송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}

