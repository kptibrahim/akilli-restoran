class SesYoneticisi {
  private aktif: boolean = true;
  private kilit = true;
  private sesler: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    if (typeof window === "undefined") return;
    const kayitli = localStorage.getItem("ses-aktif");
    this.aktif = kayitli !== "false";
  }

  // Kullanıcı gesture ile çağrılmalı (button click vs.)
  async kilidiAc(): Promise<void> {
    if (typeof window === "undefined") return;
    this.kilit = false;
    for (const tip of ["yeni-siparis", "bekliyor"]) {
      try {
        const audio = new Audio(`/sounds/${tip}.mp3`);
        audio.volume = 0.01;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.7;
        this.sesler.set(tip, audio);
      } catch {
        // Dosya yüklenemese bile kilit kaldırıldı, beep fallback devreye girer
      }
    }
  }

  isKilitli(): boolean {
    return this.kilit;
  }

  async cal(tip: "yeni-siparis" | "bekliyor") {
    if (!this.aktif || typeof window === "undefined") return;

    const audio = this.sesler.get(tip);
    if (audio) {
      audio.volume = 0.7;
      audio.currentTime = 0;
      audio.play().catch(() => this.beepFallback(tip));
      return;
    }

    // Kilitli değilse doğrudan dene (masaüstü)
    if (!this.kilit) {
      try {
        const a = new Audio(`/sounds/${tip}.mp3`);
        a.volume = 0.7;
        await a.play();
        this.sesler.set(tip, a);
        return;
      } catch {
        // beep'e düş
      }
    }

    this.beepFallback(tip);
  }

  private beepFallback(tip: string) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume().then(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = tip === "yeni-siparis" ? 880 : 440;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      });
    } catch (e) {
      console.warn("Ses oynatılamadı:", e);
    }
  }

  setAktif(deger: boolean) {
    this.aktif = deger;
    if (typeof window !== "undefined") {
      localStorage.setItem("ses-aktif", deger.toString());
    }
  }

  isAktif(): boolean {
    return this.aktif;
  }
}

export const sesYoneticisi = new SesYoneticisi();
