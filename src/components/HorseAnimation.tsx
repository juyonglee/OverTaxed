import React, { useEffect, useRef } from 'react';

interface HorseAnimationProps {
  status: 'VACANT' | 'DRIVING' | 'PREPARING';
  isSurcharge: boolean; // 2배 할증 여부
  multiplier: number;
  isBreakTime?: boolean; // 4시간 30분 휴식시간 여부
  height?: number;
  className?: string;
}

export const HorseAnimation: React.FC<HorseAnimationProps> = ({
  status,
  isSurcharge,
  multiplier,
  isBreakTime = false,
  height = 95,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frame = 0;
    let groundOffset = 0;
    const particles: Array<{ x: number; y: number; size: number; speed: number; alpha: number; color: string }> = [];

    const render = () => {
      frame++;

      // 부모 컨테이너 너비에 맞춰 캔버스 너비 동적 확장 (빈 공간 방지)
      if (canvas.parentElement) {
        const parentW = canvas.parentElement.clientWidth;
        if (parentW > 50 && canvas.width !== parentW) {
          canvas.width = parentW;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isRunning = status === 'DRIVING' && !isBreakTime;
      const speedFactor = !isRunning ? 0 : isSurcharge ? 2.5 : 1.2;

      // 바닥선
      const groundY = canvas.height - 14;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.strokeStyle = isBreakTime ? '#38bdf8' : isSurcharge ? '#ff2a55' : '#00ff66';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 바닥 도트 스트라이프 (달릴 때만 스크롤)
      if (isRunning) {
        groundOffset = (groundOffset + speedFactor * 3) % 20;
      }
      for (let x = -groundOffset; x < canvas.width; x += 20) {
        ctx.fillStyle = isBreakTime
          ? 'rgba(56, 189, 248, 0.3)'
          : isSurcharge
          ? 'rgba(255, 42, 85, 0.4)'
          : 'rgba(0, 255, 102, 0.3)';
        ctx.fillRect(x, groundY + 4, 8, 2);
      }

      // 말 렌더링 위치 (항상 가로 중앙 정렬)
      const horseX = Math.max(60, Math.floor(canvas.width / 2) - 35);
      const horseY = groundY - 45;

      // 파티클 (할증 시 불꽃, 일반 시 먼지, 휴식 시 쉼표/하트)
      if (isRunning && Math.random() < (isSurcharge ? 0.8 : 0.4)) {
        particles.push({
          x: horseX - 10,
          y: groundY - 5 + Math.random() * 8,
          size: Math.random() * (isSurcharge ? 5 : 3) + 2,
          speed: Math.random() * 3 + speedFactor * 2,
          alpha: 1,
          color: isSurcharge
            ? ['#ff0055', '#ffaa00', '#ffff00'][Math.floor(Math.random() * 3)]
            : '#64748b',
        });
      }

      // 파티클 렌더링
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x -= p.speed;
        p.alpha -= 0.03;
        if (p.alpha <= 0 || p.x < 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const horseColor = isBreakTime ? '#94a3b8' : isSurcharge ? '#ffdd00' : '#ffffff';
      const saddleColor = isBreakTime ? '#38bdf8' : isSurcharge ? '#ff0055' : '#00ff66';

      const cycle = Math.floor(frame * (isSurcharge ? 0.35 : 0.18)) % 4;
      const bobbing = isRunning ? (cycle === 1 || cycle === 3 ? -3 : 0) : 0;

      const drawPixel = (px: number, py: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(horseX + px * 3, horseY + py * 3 + bobbing, w * 3, h * 3);
      };

      // 머리 & 귀
      const headNod = isBreakTime ? (Math.sin(frame * 0.05) > 0 ? 1 : 0) : 0;
      drawPixel(10, 0 + headNod, 2, 2, horseColor); // 귀
      drawPixel(8, 2 + headNod, 5, 3, horseColor); // 머리통
      drawPixel(12, 3 + headNod, 3, 2, horseColor); // 주둥이
      drawPixel(11, 2 + headNod, 1, 1, isBreakTime ? '#38bdf8' : isSurcharge ? '#ff0000' : '#000000'); // 눈

      // 갈기
      const maneColor = isBreakTime ? '#64748b' : isSurcharge ? '#ff3b30' : '#334155';
      drawPixel(7 - (isRunning ? (cycle % 2) : 0), 2 + headNod, 2, 4, maneColor);

      // 목 & 몸통
      drawPixel(7, 4, 3, 3, horseColor);
      drawPixel(2, 6, 8, 4, horseColor);
      drawPixel(4, 5, 4, 2, saddleColor);

      // 꼬리
      if (isRunning) {
        const tailLift = isSurcharge ? -2 : (cycle % 2 === 0 ? 0 : 1);
        drawPixel(-2, 5 + tailLift, 4, 2, maneColor);
        drawPixel(-4, 4 + tailLift, 3, 2, maneColor);
      } else {
        const tailSway = Math.sin(frame * 0.08) > 0 ? 1 : 0;
        drawPixel(-1 + tailSway, 7, 2, 4, maneColor);
      }

      // 다리
      if (!isRunning) {
        drawPixel(2, 10, 2, 5, horseColor);
        drawPixel(8, 10, 2, 5, horseColor);
      } else if (cycle === 0) {
        drawPixel(0, 10, 2, 4, horseColor);
        drawPixel(-2, 13, 2, 2, horseColor);
        drawPixel(9, 10, 2, 4, horseColor);
        drawPixel(11, 13, 2, 2, horseColor);
      } else if (cycle === 1) {
        drawPixel(3, 10, 2, 4, horseColor);
        drawPixel(4, 13, 2, 2, horseColor);
        drawPixel(7, 10, 2, 4, horseColor);
        drawPixel(6, 13, 2, 2, horseColor);
      } else if (cycle === 2) {
        drawPixel(-1, 9, 2, 3, horseColor);
        drawPixel(-4, 11, 3, 2, horseColor);
        drawPixel(9, 9, 3, 3, horseColor);
        drawPixel(12, 10, 3, 2, horseColor);
      } else {
        drawPixel(1, 10, 2, 4, horseColor);
        drawPixel(0, 13, 2, 2, horseColor);
        drawPixel(8, 10, 2, 4, horseColor);
        drawPixel(10, 12, 2, 2, horseColor);
      }

      // 텍스트 라벨 (휴식 or 터보)
      if (isBreakTime) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillText('REST 30m ☕', horseX + 45, horseY + 10);
      } else if (isSurcharge && isRunning) {
        ctx.fillStyle = '#ffaa00';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('TURBO 200%', horseX + 45, horseY + 10);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, isSurcharge, multiplier, isBreakTime]);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-meter-dark border border-slate-800 shadow-inner p-2 flex flex-col items-center justify-between ${className}`}>
      {/* 상태 헤더 뱃지 */}
      <div className="w-full flex items-center justify-between px-2 sm:px-3 py-1 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isBreakTime
                ? 'bg-sky-400 animate-pulse'
                : status === 'DRIVING'
                ? isSurcharge
                  ? 'bg-rose-500 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
                : 'bg-slate-600'
            }`}
          />
          <span className="font-mono font-bold tracking-wider text-slate-300 text-[11px] sm:text-xs">
            {isBreakTime
              ? '☕ 법정 30분 의무 휴식 중'
              : status === 'DRIVING'
              ? isSurcharge
                ? '🔥 심야 할증 질주 중 (2.0x)'
                : '🐎 정규 야근 주행 중 (1.5x)'
              : status === 'PREPARING'
              ? '⏳ 20:00 영업 준비 중'
              : '🛑 빈차 (영업 대기)'}
          </span>
        </div>
        <div className="text-right">
          <span
            className={`font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded font-bold ${
              isBreakTime
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : isSurcharge
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-glow-red'
                : status === 'DRIVING'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isBreakTime ? '미터기 정지' : status === 'DRIVING' ? `${multiplier.toFixed(1)}배율 적용` : '미터기 정지'}
          </span>
        </div>
      </div>

      {/* 캔버스 (부모 너비에 100% 꽉 차도록 렌더링) */}
      <canvas
        ref={canvasRef}
        height={height}
        className="w-full block my-auto transition-all"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
