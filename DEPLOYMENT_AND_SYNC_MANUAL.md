# 🐎 말 달리는 야근 미터기 (OverTaxed) 종합 매뉴얼 & 배포 가이드

> **"택시 미터기처럼 실시간으로 올라가는 야근비!"**  
> Mac, iPhone, iPad 어디서나 실시간으로 동기화되는 레트로 택시 미터기 야근 수당 계산기입니다.

---

## 📑 목차
1. [핵심 기능 및 정산 룰 요약](#1-핵심-기능-및-정산-룰-요약)
2. [Google Sheets & 기기 간 실시간 동기화 설정 (100% 무료)](#2-google-sheets--기기-간-실시간-동기화-설정-100-무료)
3. [가장 추천하는 무료 배포 방법 (Vercel)](#3-가장-추천하는-무료-배포-방법-vercel)
4. [스마트폰(iPhone/Android) 앱처럼 설치하기 (PWA)](#4-스마트폰iphoneandroid-앱처럼-설치하기-pwa)

---

## 1. 핵심 기능 및 정산 룰 요약

### ⏱️ 야근 수당 계산 규정
* **평일 (월~금)**:
  * `20:00 ~ 22:00`: 통상시급의 **1.5배**
  * `22:00 이후`: 통상시급의 **2.0배 (심야할증)**
  * 평일에는 20:00부터 영업 시작이 활성화됩니다.
* **주말 / 공휴일**:
  * 시작 시간 무관 처음 8시간까지 **1.5배**, 8시간 초과 후 **2.0배 (휴일연장)**
  * 평일이지만 빨간 날인 경우 메인 화면의 **`[✓ 오늘 공휴일(대체공휴일)]`** 체크 시 즉시 시작 가능!
* **시계 기준 30분 정각 정렬**:
  * 예: `16:27`에 시작하면 다음 30분 단위인 `16:30`에 첫 요금이 카운트됩니다.

### 💳 택시 미터기 '통행료 (+30분)' 앞당기기
* 야근을 이미 하다가 늦게 켰을 때, **`[+ 통행료 (+30분)]`** 버튼을 누르면:
  * 시작 시각이 **직전 30분 정각 단위로 칼같이 스냅(Snap)**되어 앞당겨집니다!
  * 예: `16:44`에 누르면 ➔ **`16:00:00` 정각으로 스냅**되어 1구간 수당 즉시 합산!
  * `[- 취소]`를 누르면 원래 시작 시각과 인정 시간으로 100% 원복됩니다.

### ☕ 4시간 근무 시 30분 법정 의무 휴게시간
* 근로기준법 제54조에 따라 4시간(240분) 연속 근무 시 **30분간 요금 상승이 일시 정지**되며, 말이 쉬는 애니메이션과 카운트다운이 표시됩니다.
* 30분 휴식이 끝나면 자동으로 주행이 재개되며, 영수증에도 `-30분 공제` 내역이 인쇄됩니다.

### 💸 30분 단위 칼정산 & 자투리 무료 봉사 계산
* [영업 종료] 시 30분 단위로 완성된 시간만 실제 야근비로 정산됩니다.
* 30분을 못 채운 자투리 시간(예: 10시 32분 종료 시 2분)은 **`❤️ 회사 무료봉사: 2분 (약 ₩1,307원 상당 기부 😭)`**로 계산되어 영수증에 위트 있게 출력됩니다!

### 🚨 주간 한도 관리 (일요일 자정 초기화)
* 매주 **일요일 00:00**에 주간 누적 시간이 자동으로 0시간으로 리셋됩니다.
* 주간 한도(기본 12시간) 도달 시 **`[무급 봉사🚨]`** 램프가 점등되며 추가 요금 상승이 제한됩니다.

### 📸 영수증 공유 방식 선택 (Action Sheet)
* `[영수증 공유하기]` 클릭 시 전용 팝업이 떠서 원하는 방식을 선택할 수 있습니다:
  1. 🖼️ **영수증 이미지(PNG) 저장**: 실제 영수증 사진 다운로드
  2. 📱 **스마트폰 공유창 열기**: 카카오톡, 메시지, 에어드랍 앱 바로 선택
  3. 💬 **카카오톡 텍스트 복사**: 깔끔한 텍스트 클립보드 복사
  4. ✉️ **문자(SMS) 앱 열기**: 기본 문자 앱으로 바로 전송

---

## 2. Google Sheets & 기기 간 실시간 동기화 설정 (100% 무료)

Google Apps Script를 연동하면 **Mac에서 켜둔 미터기가 퇴근길 스마트폰에서도 똑같이 실시간으로 달립니다.**

### [1단계] Google Apps Script 코드 등록
1. 본인 **구글 드라이브**에서 빈 스프레드시트를 하나 만듭니다 (예: `야근수당_장부`).
2. 상단 메뉴에서 **[확장 프로그램] ➔ [Apps Script]**를 클릭합니다.
3. 화면에 기본으로 적혀 있는 아래 3줄을 **모두 지워서 완전히 빈 화면**으로 만듭니다:
   ```javascript
   function myFunction() {
   }
   ```
4. 아래 코드를 **전체 복사**하여 붙여넣고 상단 **디스크 아이콘(💾 저장)**을 누릅니다:

```javascript
/**
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
```

### [2단계] 웹 앱 배포 URL 생성
1. 오른쪽 위 파란색 **[배포] ➔ [새 배포]**를 누릅니다.
2. 톱니바퀴 아이콘 옆 **[유형 선택] ➔ [웹 앱 (Web App)]**을 선택합니다.
3. 설정을 확인합니다:
   * 다음 사용자 권한으로 실행: **나 (내 구글 계정)**
   * **액세스할 수 있는 사용자**: **`모든 사용자 (Anyone)`** *(★필수 체크★)*
4. 하단 파란색 **[배포]** 클릭 후 표시되는 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec`)을 복사합니다.

### [3단계] 앱 설정에 등록
1. 미터기 앱 우측 상단 **[설정 ⚙️]**을 엽니다.
2. **Google Sheets 실시간 동기화**를 켜고 복사한 URL을 붙여넣습니다.
3. **[연결 테스트]** 클릭 ➔ "성공" 확인 후 **[설정 저장하기]** 클릭!
4. 이제 상단 헤더에 **`[☁️ 클라우드 동기화]`** 녹색 불이 들어오며 기기 간 실시간 연동이 가동됩니다.

---

## 3. 가장 추천하는 무료 배포 방법 (Vercel)

가장 추천하는 플랫폼은 **[Vercel (버셀)](https://vercel.com)**입니다.

### 🌟 Vercel을 추천하는 이유
1. **평생 100% 완전 무료 (Hobby 요금제)**: 개인 토이 프로젝트에 비용이 전혀 발생하지 않습니다.
2. **초고속 HTTPS 기본 제공**: 스마트폰에서 "홈 화면에 추가(PWA)" 및 이미지 공유 기능이 제대로 동작하려면 보안 프로토콜(`https://`)이 필수인데, Vercel은 무료 SSL 인증서를 자동 발급해 줍니다.
3. **자동 배포 (CI/CD)**: 코드를 수정해서 GitHub에 올리면 30초 안에 자동으로 업데이트됩니다.
4. **글로벌 엣지 CDN**: 전 세계 어디서 접속해도 1초 미만으로 앱이 즉시 열립니다.

---

### 🚀 Vercel 배포 3단계 (소요 시간: 약 3분)

#### Step 1: GitHub에 코드 올리기
1. [GitHub](https://github.com)에 로그인 후, 우측 상단 `+` 버튼 ➔ **[New repository]**를 클릭합니다.
2. Repository name에 `OverTaxed`를 입력하고, **[Create repository]**를 누릅니다.
3. 터미널(터미널 앱)을 열고 현재 프로젝트 폴더(`/Users/juyonglee/Desktop/OverTaxed`)에서 아래 명령어를 실행합니다:
   ```bash
   cd /Users/juyonglee/Desktop/OverTaxed
   git remote add origin https://github.com/본인GitHub아이디/OverTaxed.git
   git branch -M main
   git push -u origin main
   ```

#### Step 2: Vercel 계정 연동 및 배포
1. [Vercel 공식 사이트 (vercel.com)](https://vercel.com)에 접속하여 **[Sign Up]** (GitHub 계정으로 로그인)합니다.
2. 대시보드에서 **[Add New...] ➔ [Project]**를 클릭합니다.
3. 방금 올린 **`OverTaxed`** 저장소가 목록에 나타납니다. 오른쪽의 **[Import]** 버튼을 누릅니다.
4. Framework Preset이 **`Vite`**로 자동 인식되어 있습니다. 다른 설정은 건드릴 필요 없이 하단의 **[Deploy]** 버튼을 누릅니다!
5. 약 30초 후 폭죽 애니메이션과 함께 **나만의 영구 무료 웹 주소**가 생성됩니다!  
   (예: `https://overtaxed-beta.vercel.app`)

---

## 4. 스마트폰(iPhone/Android) 앱처럼 설치하기 (PWA)

배포된 웹 주소(`https://...vercel.app`)를 스마트폰 브라우저로 열면 실제 앱스토어에서 받은 앱처럼 설치할 수 있습니다:

### 🍎 iPhone / iPad (Safari)
1. **사파리(Safari)** 브라우저로 배포된 웹 주소에 접속합니다.
2. 화면 하단 중앙의 **[공유 버튼 (네모에 위 화살표 ↑)]**을 누릅니다.
3. 메뉴를 아래로 내려 **`[홈 화면에 추가]`**를 탭합니다.
4. 오른쪽 위 **[추가]**를 누르면, 홈 화면에 귀여운 **🐎 말 아이콘의 '야근미터기' 앱**이 생성됩니다!
5. 앱을 누르면 주소창 없는 **전체 화면 네이티브 앱**으로 쾌적하게 실행됩니다.

### 🤖 Android 갤럭시 (Chrome)
1. **크롬(Chrome)** 브라우저로 배포된 주소에 접속합니다.
2. 오른쪽 상단 **점 3개 메뉴(⋮)**를 누릅니다.
3. **`[홈 화면에 추가]`** 또는 **`[앱 설치]`**를 누르면 홈 화면에 정식 앱으로 설치됩니다.
