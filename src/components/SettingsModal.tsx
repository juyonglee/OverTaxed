import React, { useState } from 'react';
import { AppSettings, SoundSettings } from '../types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, syncRecordToGoogleSheets } from '../utils/googleSheets';
import { soundFx } from '../utils/audio';
import { formatKRW } from '../utils/calculator';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Copy,
  Check,
  Send,
  HelpCircle,
  FlaskConical,
  ShieldAlert,
  Coffee,
  Play,
} from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => ({
    ...settings,
    soundSettings: settings.soundSettings || {
      master: settings.soundEnabled !== false,
      buttonBeep: true,
      settlementSound: 'both',
      surchargeAlarm: true,
      breakAlarm: true,
      receiptPrint: true,
    },
    enforceBreakTime: settings.enforceBreakTime !== false,
  }));

  const [copied, setCopied] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    // 1차 시도: Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(GOOGLE_APPS_SCRIPT_TEMPLATE)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopyText(GOOGLE_APPS_SCRIPT_TEMPLATE);
        });
    } else {
      fallbackCopyText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert('클립보드 권한이 차단되었습니다. 아래 코드 박스에서 직접 전체 선택(Cmd+A) 후 복사해 주세요!');
      }
    } catch {
      alert('클립보드 복사 실패: 아래 코드 박스에서 직접 복사해 주세요.');
    }
  };

  const handleTestSend = async () => {
    if (!localSettings.googleScriptUrl) {
      alert('Google Apps Script 웹 앱 URL을 먼저 입력해 주세요.');
      return;
    }
    setTestSending(true);
    setTestResult(null);

    const dummyRecord = {
      id: 'test-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date().toISOString(),
      isWeekendOrHoliday: false,
      hourlyRate: localSettings.hourlyRate,
      totalMinutes: 60,
      settledMinutes: 60,
      normalOvertimeMinutes: 60,
      nightOvertimeMinutes: 0,
      breakDeductedMinutes: 0,
      totalPay: Math.round(localSettings.hourlyRate * 1.5),
      notes: '테스트 연결 전송',
    };

    const res = await syncRecordToGoogleSheets(localSettings.googleScriptUrl, dummyRecord);
    setTestSending(false);
    setTestResult(res.message);
  };

  const handleSave = () => {
    onSave({
      ...localSettings,
      soundEnabled: localSettings.soundSettings.master,
    });
    onClose();
  };

  const updateSound = (partial: Partial<SoundSettings>) => {
    const nextSound = { ...localSettings.soundSettings, ...partial };
    setLocalSettings({ ...localSettings, soundSettings: nextSound });
    soundFx.updateSettings(nextSound);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-meter-card border border-slate-700 p-5 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">환경 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 시급 설정 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">
            나의 기준 통상 시급 (원)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-500 font-digital">₩</span>
            <input
              type="number"
              value={localSettings.hourlyRate}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, hourlyRate: Number(e.target.value) || 0 })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-8 pr-3 text-emerald-400 font-digital text-lg font-bold focus:outline-none focus:border-emerald-500 transition"
              placeholder="19610"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            현재 설정: {formatKRW(localSettings.hourlyRate)}원 (1.5배: {formatKRW(Math.round(localSettings.hourlyRate * 1.5))}원 / 2.0배: {formatKRW(Math.round(localSettings.hourlyRate * 2.0))}원)
          </p>
        </div>

        {/* 2. ☕ 4시간 근무 시 30분 의무 휴식 설정 */}
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  4시간 근무 시 30분 의무 휴식
                </div>
                <div className="text-[10px] text-slate-400">
                  근로기준법에 따라 4시간마다 30분 요금 카운트 자동 정지
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enforceBreakTime}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, enforceBreakTime: e.target.checked })
              }
              className="w-4 h-4 accent-sky-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. 🔊 효과음 세부 설정 (개별 옵션) */}
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              {localSettings.soundSettings.master ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-xs font-bold text-slate-200">전체 사운드 켜기/끄기</span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.soundSettings.master}
              onChange={(e) => updateSound({ master: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {localSettings.soundSettings.master && (
            <div className="flex flex-col gap-2 text-xs">
              {/* 30분 정산 효과음 선택 */}
              <div className="flex flex-col gap-1.5 p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300 text-[11px]">
                    30분 요금 정산 사운드
                  </span>
                  <button
                    type="button"
                    onClick={() => soundFx.playSettlementSound()}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    미리듣기
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { key: 'neigh', label: '🐎 말 울음' },
                      { key: 'cash', label: '💰 돈(짤랑)' },
                      { key: 'both', label: '✨ 둘 다 (추천)' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        updateSound({ settlementSound: opt.key });
                        setTimeout(() => soundFx.playSettlementSound(), 50);
                      }}
                      className={`py-1.5 px-2 rounded text-[11px] font-bold border transition ${
                        localSettings.soundSettings.settlementSound === opt.key
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 개별 사운드 토글 목록 */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-slate-800 cursor-pointer">
                  <span className="text-slate-300">☕ 4시간 휴식 알림음</span>
                  <input
                    type="checkbox"
                    checked={localSettings.soundSettings.breakAlarm}
                    onChange={(e) => updateSound({ breakAlarm: e.target.checked })}
                    className="w-3.5 h-3.5 accent-sky-400"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-slate-800 cursor-pointer">
                  <span className="text-slate-300">🔥 2배 할증 경보음</span>
                  <input
                    type="checkbox"
                    checked={localSettings.soundSettings.surchargeAlarm}
                    onChange={(e) => updateSound({ surchargeAlarm: e.target.checked })}
                    className="w-3.5 h-3.5 accent-amber-400"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-slate-800 cursor-pointer">
                  <span className="text-slate-300">🔘 버튼 클릭음 (삑)</span>
                  <input
                    type="checkbox"
                    checked={localSettings.soundSettings.buttonBeep}
                    onChange={(e) => updateSound({ buttonBeep: e.target.checked })}
                    className="w-3.5 h-3.5 accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-slate-800 cursor-pointer">
                  <span className="text-slate-300">🧾 영수증 출력음</span>
                  <input
                    type="checkbox"
                    checked={localSettings.soundSettings.receiptPrint}
                    onChange={(e) => updateSound({ receiptPrint: e.target.checked })}
                    className="w-3.5 h-3.5 accent-emerald-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 4. 주간 야근 한도 설정 */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">
                주간 야근 인정 한도 (일요일 자정 리셋)
              </div>
              <div className="text-[10px] text-slate-400">
                초과 시 회사에서 돈 안 주는 주간 한도 시간
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              min="0"
              max="52"
              value={localSettings.weeklyLimitHours}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, weeklyLimitHours: Number(e.target.value) || 0 })
              }
              className="w-24 bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-sm text-amber-300 font-bold font-mono focus:outline-none focus:border-amber-400"
              placeholder="12"
            />
            <span className="text-xs text-slate-300 font-mono">시간 / 주 (0이면 무제한)</span>
          </div>

          <label className="flex items-center gap-2 mt-1 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={localSettings.stopPayOnLimitReached}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, stopPayOnLimitReached: e.target.checked })
              }
              className="w-4 h-4 accent-rose-500 cursor-pointer"
            />
            <span className="text-rose-300">한도 초과 시 요금 계산 중단 (무급 봉사 모드)</span>
          </label>
        </div>

        {/* 5. Google Sheets 연동 */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  Google Sheets 실시간 동기화
                </div>
                <div className="text-[10px] text-slate-500">내 구글 시트에 야근 기록 자동 저장</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.useGoogleSheets}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, useGoogleSheets: e.target.checked })
              }
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {localSettings.useGoogleSheets && (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-800">
              <label className="text-[11px] text-slate-400 font-mono">
                Google Apps Script 웹 앱 URL
              </label>
              <input
                type="text"
                value={localSettings.googleScriptUrl}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, googleScriptUrl: e.target.value })
                }
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={testSending}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1 transition"
                >
                  <Send className="w-3 h-3 text-emerald-400" />
                  {testSending ? '전송 중...' : '연결 테스트'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1 transition ml-auto"
                >
                  <HelpCircle className="w-3 h-3 text-cyan-400" />
                  설정 가이드 & 코드
                </button>
              </div>

              {testResult && (
                <div className="text-[11px] text-emerald-400 p-2 bg-emerald-950/30 rounded border border-emerald-800/40">
                  {testResult}
                </div>
              )}

              {showScriptGuide && (
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex flex-col gap-2.5 mt-1">
                  <p className="font-bold text-emerald-400">구글 시트 연동 4단계 (100% 무료):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>구글 드라이브에서 빈 스프레드시트 하나를 만듭니다.</li>
                    <li>메뉴에서 <strong>[확장 프로그램] &gt; [Apps Script]</strong>를 클릭합니다.</li>
                    <li className="text-amber-300">
                      화면에 보이는 <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-400">function myFunction() &#123; &#125;</code> 3줄을 <strong>모두 싹 지워서 빈 화면</strong>으로 만듭니다.
                    </li>
                    <li>아래 코드를 복사해서 그대로 붙여넣습니다 (Cmd + V).</li>
                    <li>
                      오른쪽 위 <strong>[배포] &gt; [새 배포]</strong> 클릭 ➔ 유형: <strong>웹 앱</strong> ➔ 액세스: <strong>모든 사용자(Anyone)</strong> 선택 후 [배포]!
                    </li>
                  </ol>

                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '✅ 복사 완료! Apps Script에 붙여넣으세요' : 'Apps Script 코드 원클릭 복사하기'}</span>
                  </button>

                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      (원클릭 복사가 안 될 경우 아래 상자 클릭 ➔ Cmd+A ➔ Cmd+C):
                    </span>
                    <textarea
                      readOnly
                      value={GOOGLE_APPS_SCRIPT_TEMPLATE}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-2 text-[10px] font-mono text-emerald-400/90 focus:outline-none select-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. 시간 여행 시뮬레이터 */}
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">시간 여행 (시뮬레이터 모드)</div>
                <div className="text-[10px] text-slate-500">평일 낮에도 심야 할증(22시~)을 즉시 체험</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.testMode}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, testMode: e.target.checked })
              }
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          {localSettings.testMode && (
            <div className="grid grid-cols-2 gap-1.5 mt-1 pt-2 border-t border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, simulatedHour: 20 })}
                className={`p-2 rounded-lg border text-center ${
                  localSettings.simulatedHour === 20
                    ? 'border-amber-400 bg-amber-950/40 text-amber-300 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                평일 20:30 (1.5x)
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, simulatedHour: 23 })}
                className={`p-2 rounded-lg border text-center ${
                  localSettings.simulatedHour === 23
                    ? 'border-rose-400 bg-rose-950/40 text-rose-300 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                평일 23:30 (2.0x 할증)
              </button>
            </div>
          )}
        </div>

        {/* 하단 저장 버튼 */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-glow-green transition active:scale-98 mt-1"
        >
          설정 저장하기
        </button>
      </div>
    </div>
  );
};
