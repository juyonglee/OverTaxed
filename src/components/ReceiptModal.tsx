import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { ShiftRecord } from '../types';
import { formatKRW, formatDuration } from '../utils/calculator';
import { X, CheckCircle2, AlertCircle, Share2, Download, Copy, Check, MessageSquare } from 'lucide-react';

interface ReceiptModalProps {
  record: ShiftRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  syncStatus?: { success: boolean; message: string } | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  record,
  isOpen,
  onClose,
  onDelete,
  syncStatus,
}) => {
  const receiptCardRef = useRef<HTMLDivElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ff66', '#ffaa00', '#3b82f6', '#ec4899'],
      });
    }
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const startDate = new Date(record.startTime);
  const endDate = new Date(record.endTime);

  const startStr = startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endStr = endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  // 카카오톡/문자 전송용 포맷 텍스트
  const shareText = `[🐎 야근 미터기 영수증]
📅 일자: ${record.date} (${record.isWeekendOrHoliday ? '휴일근무' : '평일야근'})
⏱️ 시간: ${startStr} ~ ${endStr} (인정: ${formatDuration(record.settledMinutes)})
${record.breakDeductedMinutes > 0 ? `☕ 휴게시간: -${formatDuration(record.breakDeductedMinutes)} 공제\n` : ''}💰 최종 야근수당: ₩${formatKRW(record.totalPay)}원
(야근 택시 미터기로 정산 완료!)`;

  // 1. 🖼️ 이미지로 저장 및 모바일 카카오톡/메시지 직접 공유
  const handleCaptureAndShareImage = async () => {
    if (!receiptCardRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2, // 고해상도 레티나
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsCapturing(false);
          return;
        }

        const fileName = `야근영수증_${record.date}_${startStr.replace(':', '')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // 모바일 브라우저의 Web Share API로 파일 직접 공유 (카카오톡, 메시지 등 선택창)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: '오늘의 야근 수당 영수증 🐎',
              text: shareText,
            });
            setIsCapturing(false);
            return;
          } catch {
            // 사용자가 공유 창을 취소한 경우 다운로드로 대체 진행
          }
        }

        // 데스크톱 또는 Web Share 미지원 시 이미지 즉시 다운로드
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setCopyFeedback('영수증 이미지가 저장되었습니다!');
        setTimeout(() => setCopyFeedback(null), 2500);
        setIsCapturing(false);
      }, 'image/png');
    } catch {
      setIsCapturing(false);
      alert('이미지 생성 중 오류가 발생했습니다. 텍스트 복사를 이용해 주세요.');
    }
  };

  // 2. 💬 카카오톡 / 문자 붙여넣기용 텍스트 복사
  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopyFeedback('영수증 텍스트가 복사되었습니다! 카톡에 붙여넣기(Cmd+V)하세요.');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // 3. 📱 모바일 문자(SMS) 앱 열기
  const handleOpenSMS = () => {
    const encoded = encodeURIComponent(shareText);
    window.location.href = `sms:?body=${encoded}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#fdfdfd] text-slate-800 p-5 sm:p-6 shadow-2xl border border-slate-300 font-mono flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 📸 캡처 대상 영수증 카드 영역 (receiptCardRef) */}
        <div ref={receiptCardRef} className="bg-white p-3 rounded-xl flex flex-col gap-3">
          {/* 영수증 헤더 */}
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-3">
            <div className="text-xl font-black tracking-wider text-slate-900 flex items-center justify-center gap-1.5">
              <span>🐎</span>
              <span>야근 미터기 영수증</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              OVERTAXED TAXI FARE RECEIPT
            </div>
            <div className="text-[10px] text-slate-500">
              {record.date} {endStr} 발행
            </div>
          </div>

          {/* 세부 탑승(근무) 내역 */}
          <div className="flex flex-col gap-1.5 text-xs border-b-2 border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">근무 구분</span>
              <span className="font-bold text-slate-800">
                {record.isWeekendOrHoliday ? '휴일/주말 근무' : '평일 야근'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">탑승(근무) 시간</span>
              <span className="font-bold text-slate-800">
                {startStr} ~ {endStr}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">총 소요 시간</span>
              <span className="text-slate-700">{formatDuration(record.totalMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">30분 정산 인정</span>
              <span className="font-bold text-slate-900">{formatDuration(record.settledMinutes)}</span>
            </div>
            {record.breakDeductedMinutes > 0 && (
              <div className="flex justify-between text-sky-700 font-medium text-[11px]">
                <span>☕ 4시간 의무 휴게시간</span>
                <span>-{formatDuration(record.breakDeductedMinutes)} 공제</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">기준 통상 시급</span>
              <span className="text-slate-700">₩{formatKRW(record.hourlyRate)}</span>
            </div>

            <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between text-[11px]">
              <span className="text-slate-500">└ 일반야근 (1.5x)</span>
              <span>{formatDuration(record.normalOvertimeMinutes)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">└ 심야/연장할증 (2.0x)</span>
              <span className="text-rose-600 font-semibold">{formatDuration(record.nightOvertimeMinutes)}</span>
            </div>
          </div>

          {/* 총 청구 요금 */}
          <div className="flex justify-between items-baseline py-1">
            <span className="text-sm font-bold text-slate-900">총 야근 수당</span>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600">
                ₩{formatKRW(record.totalPay)}
              </span>
              <span className="text-[10px] text-slate-400 block font-normal">부가세(스트레스) 포함</span>
            </div>
          </div>
        </div>

        {/* 구글 시트 동기화 상태 뱃지 */}
        {syncStatus && (
          <div
            className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
              syncStatus.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {syncStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="truncate text-[11px]">{syncStatus.message}</span>
          </div>
        )}

        {/* 피드백 알림 배너 */}
        {copyFeedback && (
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1 animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{copyFeedback}</span>
          </div>
        )}

        {/* 🚀 공유 & 이미지 저장 액션 버튼들 */}
        <div className="flex flex-col gap-2 mt-1">
          {/* 이미지 저장 & 공유 (카카오톡, 인스타, 이미지 다운로드) */}
          <button
            type="button"
            onClick={handleCaptureAndShareImage}
            disabled={isCapturing}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/20 transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            {isCapturing ? '영수증 이미지 생성 중...' : '🖼️ 영수증 이미지 저장 / 카톡 공유'}
          </button>

          {/* 텍스트 복사 & 문자 공유 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              카톡 텍스트 복사
            </button>
            <button
              type="button"
              onClick={handleOpenSMS}
              className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              문자로 보내기
            </button>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-98 shadow-md shadow-emerald-600/30 mt-1"
          >
            확인 (수고하셨습니다!)
          </button>

          {/* 영수증 삭제 버튼 */}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('방금 저장된 이 야근 기록을 정말 삭제하시겠습니까?')) {
                  onDelete(record.id);
                  onClose();
                }
              }}
              className="text-[11px] text-rose-500 hover:text-rose-600 hover:underline py-0.5 text-center transition"
            >
              🗑️ 이 야근 기록 삭제하기 (잘못 저장했을 때)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
