import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { ShiftRecord } from '../types';
import { formatKRW, formatDuration } from '../utils/calculator';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Share2,
  Download,
  Copy,
  Check,
  MessageSquare,
  Smartphone,
  Image as ImageIcon,
} from 'lucide-react';

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
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

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

  const unpaidMins = record.unpaidMinutes || 0;
  const unpaidAmt = record.unpaidAmount || 0;
  const minsToNextBlock = unpaidMins > 0 ? 30 - unpaidMins : 0;

  // 카카오톡/문자 전송용 포맷 텍스트
  const shareText = `[🐎 야근 미터기 영수증]
📅 일자: ${record.date} (${record.isWeekendOrHoliday ? '휴일근무' : '평일야근'})
⏱️ 시간: ${startStr} ~ ${endStr}
✅ 30분 단위 인정: ${formatDuration(record.settledMinutes)} (₩${formatKRW(record.totalPay)}원)
${unpaidMins > 0 ? `❤️ 회사 무료봉사: ${unpaidMins}분 (약 ₩${formatKRW(unpaidAmt)}원 상당 기부 😭)\n` : ''}${record.breakDeductedMinutes > 0 ? `☕ 휴게시간: -${formatDuration(record.breakDeductedMinutes)} 공제\n` : ''}💰 최종 정산 수당: ₩${formatKRW(record.totalPay)}원
(야근 택시 미터기로 칼같이 정산 완료!)`;

  // 1. 🖼️ 영수증 이미지 파일 다운로드
  const handleDownloadImage = async () => {
    if (!receiptCardRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const fileName = `야근영수증_${record.date}_${startStr.replace(':', '')}.png`;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setCopyFeedback('영수증 이미지가 저장되었습니다!');
      setIsShareSheetOpen(false);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      alert('이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  // 2. 📱 모바일 네이티브 공유창 열기 (카카오톡, 메시지, 에어드랍 등)
  const handleNativeShare = async () => {
    if (!receiptCardRef.current) return;
    setIsCapturing(true);

    try {
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        setIsCapturing(false);
        if (!blob) return;

        const fileName = `야근영수증_${record.date}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: '오늘의 야근 수당 영수증 🐎',
              text: shareText,
            });
            setIsShareSheetOpen(false);
            return;
          } catch {}
        }

        // 일반 텍스트 공유 fallback
        if (navigator.share) {
          try {
            await navigator.share({
              title: '오늘의 야근 수당 영수증 🐎',
              text: shareText,
            });
            setIsShareSheetOpen(false);
            return;
          } catch {}
        }

        // 지원 안 되는 경우 이미지 다운로드로 대체
        handleDownloadImage();
      }, 'image/png');
    } catch {
      setIsCapturing(false);
      handleCopyText();
    }
  };

  // 3. 💬 카카오톡 붙여넣기용 텍스트 복사
  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopyFeedback('카톡용 영수증 텍스트가 복사되었습니다! 붙여넣기(Cmd+V)하세요.');
    setIsShareSheetOpen(false);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // 4. ✉️ 문자(SMS) 앱 열기
  const handleOpenSMS = () => {
    const encoded = encodeURIComponent(shareText);
    setIsShareSheetOpen(false);
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

        {/* 📸 캡처 대상 영수증 카드 영역 */}
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
            <div className="flex justify-between bg-emerald-50/80 p-1 rounded font-bold">
              <span className="text-emerald-900">30분 정산 인정</span>
              <span className="text-emerald-700">{formatDuration(record.settledMinutes)}</span>
            </div>

            {/* 자투리 무료 봉사 기부 시간 & 금액 */}
            {unpaidMins > 0 && (
              <div className="flex flex-col gap-0.5 bg-rose-50/70 p-1.5 rounded border border-rose-200/60 text-[11px]">
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>❤️ 회사 무료봉사 (자투리)</span>
                  <span>{unpaidMins}분 (약 ₩{formatKRW(unpaidAmt)})</span>
                </div>
                <div className="text-[10px] text-rose-500 font-mono">
                  ※ 30분을 못 채워 회사에 기부되었습니다 ({minsToNextBlock}분 부족 😭)
                </div>
              </div>
            )}

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

        {/* 🚀 메인 액션 버튼 */}
        <div className="flex flex-col gap-2 mt-1">
          {/* 공유하기 누르면 선택 팝업 열기 */}
          <button
            type="button"
            onClick={() => setIsShareSheetOpen(true)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 transition active:scale-98 cursor-pointer"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>영수증 공유하기 (선택)</span>
          </button>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-98 shadow-md shadow-emerald-600/30"
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

      {/* 📋 공유 방식 선택 모달 (Action Sheet) */}
      {isShareSheetOpen && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 flex flex-col gap-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">공유 방식 선택</h3>
              </div>
              <button
                onClick={() => setIsShareSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              오늘의 야근 수당 영수증을 어떻게 공유할까요?
            </p>

            <div className="flex flex-col gap-2 my-1">
              {/* 1. 영수증 이미지 저장 */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isCapturing}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 text-left transition active:scale-98"
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    🖼️ 영수증 이미지(PNG) 저장
                  </span>
                  <span className="text-[11px] text-slate-400">
                    선명한 택시 영수증 캡처 사진 다운로드
                  </span>
                </div>
              </button>

              {/* 2. 카카오톡/메시지 앱 직접 공유 */}
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={isCapturing}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 text-left transition active:scale-98"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    📱 스마트폰 공유창 열기
                  </span>
                  <span className="text-[11px] text-slate-400">
                    카카오톡, 문자, 에어드랍 앱 바로 선택
                  </span>
                </div>
              </button>

              {/* 3. 카카오톡 텍스트 복사 */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 text-left transition active:scale-98"
              >
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    💬 카카오톡 텍스트 복사
                  </span>
                  <span className="text-[11px] text-slate-400">
                    단톡방이나 슬랙에 바로 붙여넣기
                  </span>
                </div>
              </button>

              {/* 4. 문자로 보내기 */}
              <button
                type="button"
                onClick={handleOpenSMS}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 text-left transition active:scale-98"
              >
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    ✉️ 문자 메시지(SMS) 전송
                  </span>
                  <span className="text-[11px] text-slate-400">
                    기본 메시지 앱으로 영수증 바로 전송
                  </span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsShareSheetOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition mt-1"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
