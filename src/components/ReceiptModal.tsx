import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ShiftRecord } from '../types';
import { formatKRW, formatDuration } from '../utils/calculator';
import { X, CheckCircle2, AlertCircle, Share2, Printer } from 'lucide-react';

interface ReceiptModalProps {
  record: ShiftRecord | null;
  isOpen: boolean;
  onClose: () => void;
  syncStatus?: { success: boolean; message: string } | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  record,
  isOpen,
  onClose,
  syncStatus,
}) => {
  useEffect(() => {
    if (isOpen) {
      // 영업 종료 축하 폭죽 효과
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '오늘의 야근 수당 영수증 🐎',
        text: `오늘 야근 총 ${formatDuration(record.settledMinutes)} 달리고 ₩${formatKRW(record.totalPay)}원 정산 완료! (야근 미터기)`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `[야근 영수증] 일자: ${record.date} | 시간: ${startStr}~${endStr} | 정산액: ${formatKRW(record.totalPay)}원`
      );
      alert('영수증 내용이 클립보드에 복사되었습니다!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#fdfdfd] text-slate-800 p-6 shadow-2xl border border-slate-300 font-mono flex flex-col gap-4">
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-750 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 영수증 헤더 */}
        <div className="text-center border-b-2 border-dashed border-slate-300 pb-3">
          <div className="text-xl font-black tracking-wider text-slate-900 flex items-center justify-center gap-1.5">
            <span>🐎</span>
            <span>야근 미터기 영수증</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            OVERTAXED TAXI FARE RECEIPT
          </div>
          <div className="text-[11px] text-slate-500">
            {record.date} {endStr} 발행
          </div>
        </div>

        {/* 세부 탑승(근무) 내역 */}
        <div className="flex flex-col gap-2 text-xs border-b-2 border-dashed border-slate-300 pb-3">
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
            <span className="text-slate-500">30분 정산 시간</span>
            <span className="font-bold text-slate-900">{formatDuration(record.settledMinutes)}</span>
          </div>
          {record.breakDeductedMinutes > 0 && (
            <div className="flex justify-between text-sky-700 font-medium">
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
          <span className="text-base font-bold text-slate-900">총 야근 수당</span>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-600">
              ₩{formatKRW(record.totalPay)}
            </span>
            <span className="text-xs text-slate-400 block font-normal">부가세(스트레스) 포함</span>
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
            <span className="truncate">{syncStatus.message}</span>
          </div>
        )}

        {/* 하단 공유 & 확인 버튼 */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={handleShare}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            영수증 공유
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-600/30"
          >
            확인 (수고하셨습니다!)
          </button>
        </div>
      </div>
    </div>
  );
};

