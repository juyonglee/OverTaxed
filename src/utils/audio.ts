import { SoundSettings } from '../types';

// Web Audio API를 활용한 레트로 택시 사운드 합성기
class RetroSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = {
    master: true,
    buttonBeep: true,
    settlementSound: 'both',
    surchargeAlarm: true,
    breakAlarm: true,
    receiptPrint: true,
  };

  public updateSettings(settings: SoundSettings) {
    this.settings = settings;
  }

  public setEnabled(enabled: boolean) {
    this.settings.master = enabled;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 버튼 클릭음 (택시 미터기 삑)
   */
  public playBeep() {
    if (!this.settings.master || !this.settings.buttonBeep) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  /**
   * 영업 시작 (미터기 찰칵 주행 시작음)
   */
  public playStartDrive() {
    if (!this.settings.master) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(260, now + 0.06);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1400, now + 0.07);
      gain2.gain.setValueAtTime(0.15, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.15);
    } catch {}
  }

  /**
   * 🐎 말 울음소리 (히히힝~! Horse Whinny Synth)
   */
  public playHorseNeigh() {
    if (!this.settings.master) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 주파수 변조 (FM 합성)로 말의 울음소리 떨림 연출
      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const mainGain = this.ctx.createGain();

      carrier.type = 'sawtooth';
      // 시작 고음에서 서서히 내려오면서 떨림
      carrier.frequency.setValueAtTime(950, now);
      carrier.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
      carrier.frequency.exponentialRampToValueAtTime(600, now + 0.65);

      // 모듈레이터: 16Hz 비브라토 떨림
      modulator.frequency.setValueAtTime(18, now);
      modGain.gain.setValueAtTime(120, now);
      modGain.gain.linearRampToValueAtTime(250, now + 0.2);
      modGain.gain.linearRampToValueAtTime(30, now + 0.65);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      mainGain.gain.setValueAtTime(0.01, now);
      mainGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      carrier.connect(mainGain);
      mainGain.connect(this.ctx.destination);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + 0.7);
      carrier.stop(now + 0.7);
    } catch {}
  }

  /**
   * 💰 돈 올라가는 소리 (짤랑! / 카칭 Ka-ching)
   */
  public playCashSound() {
    if (!this.settings.master) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. 금속성 카운터 짤깍
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // 2. 높은 동전 짤랑음 (E6)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);

      // 3. 더 높은 벨소리 (B6)
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1975.53, now + 0.15); // B6
      gain3.gain.setValueAtTime(0.2, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.5);
    } catch {}
  }

  /**
   * 30분 정산 시 복합 사운드 (설정에 따라 말소리 / 돈소리 / 둘 다)
   */
  public playSettlementSound() {
    if (!this.settings.master) return;
    const mode = this.settings.settlementSound;
    if (mode === 'neigh') {
      this.playHorseNeigh();
    } else if (mode === 'cash') {
      this.playCashSound();
    } else if (mode === 'both') {
      this.playHorseNeigh();
      setTimeout(() => this.playCashSound(), 200);
    }
  }

  /**
   * 요금 상승 시 사운드 (하위 호환)
   */
  public playMeterTick() {
    this.playSettlementSound();
  }

  /**
   * ☕ 4시간 휴식시간 알림음 (띵-동-댕-동 평화로운 차임벨)
   */
  public playBreakChime() {
    if (!this.settings.master || !this.settings.breakAlarm) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (화음)

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0.18, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.5);
      });
    } catch {}
  }

  /**
   * 2배 심야/연장 할증 발동 경보음
   */
  public playSurchargeAlarm() {
    if (!this.settings.master || !this.settings.surchargeAlarm) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [0, 0.12, 0.24].forEach((delay, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(idx === 2 ? 1760 : 1320, now + delay);
        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });
    } catch {}
  }

  /**
   * 영업 종료 (영수증 출력 지직 소리)
   */
  public playReceiptPrint() {
    if (!this.settings.master || !this.settings.receiptPrint) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.2);
      osc.frequency.linearRampToValueAtTime(400, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }
}

export const soundFx = new RetroSoundSynthesizer();
