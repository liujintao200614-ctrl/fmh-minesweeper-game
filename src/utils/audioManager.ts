// 音效管理器
export interface AudioConfig {
  volume: number;
  enabled: boolean;
}

export interface SoundEffect {
  name: string;
  url: string;
  volume?: number;
}

class AudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private audioBuffers = new Map<string, AudioBuffer>();
  private config: AudioConfig = {
    volume: 0.5,
    enabled: true
  };
  
  // 预定义的音效
  private soundEffects: SoundEffect[] = [
    { name: 'click', url: '/sounds/click.wav', volume: 0.3 },
    { name: 'flag', url: '/sounds/flag.wav', volume: 0.4 },
    { name: 'unflag', url: '/sounds/unflag.wav', volume: 0.4 },
    { name: 'explosion', url: '/sounds/explosion.wav', volume: 0.7 },
    { name: 'win', url: '/sounds/win.wav', volume: 0.8 },
    { name: 'reveal', url: '/sounds/reveal.wav', volume: 0.2 },
    { name: 'tick', url: '/sounds/tick.wav', volume: 0.1 }
  ];

  static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  private constructor() {
    this.initializeAudioContext();
    this.loadConfig();
  }

  private async initializeAudioContext() {
    if (typeof window === 'undefined') return; // SSR guard
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 处理浏览器的自动播放策略
      if (this.audioContext.state === 'suspended') {
        const resumeAudio = () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }
          document.removeEventListener('touchstart', resumeAudio);
          document.removeEventListener('click', resumeAudio);
        };
        
        document.addEventListener('touchstart', resumeAudio, { once: true });
        document.addEventListener('click', resumeAudio, { once: true });
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private loadConfig() {
    if (typeof window === 'undefined') return; // SSR guard
    
    try {
      const saved = localStorage.getItem('minesweeper-audio-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load audio config:', error);
    }
  }

  private saveConfig() {
    if (typeof window === 'undefined') return; // SSR guard
    
    try {
      localStorage.setItem('minesweeper-audio-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save audio config:', error);
    }
  }

  // 预加载音效
  async preloadSounds(): Promise<void> {
    if (!this.audioContext || !this.config.enabled) return;

    const loadPromises = this.soundEffects.map(async (sound) => {
      try {
        const response = await fetch(sound.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(sound.name, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound ${sound.name}:`, error);
        // 为失败的音效创建空白音效
        this.createSilentBuffer(sound.name);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  // 创建静默音效缓冲区
  private createSilentBuffer(name: string) {
    if (!this.audioContext) return;
    
    const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
    this.audioBuffers.set(name, buffer);
  }

  // 播放音效
  playSound(soundName: string, options: { volume?: number; playbackRate?: number } = {}): void {
    if (!this.config.enabled || !this.audioContext || this.audioContext.state !== 'running') {
      return;
    }

    const buffer = this.audioBuffers.get(soundName);
    if (!buffer) {
      // 如果音效未加载，尝试使用程序生成的音效
      this.playGeneratedSound(soundName, options);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 设置音量
      const soundEffect = this.soundEffects.find(s => s.name === soundName);
      const baseVolume = soundEffect?.volume ?? 0.5;
      const volume = (options.volume ?? baseVolume) * this.config.volume;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      
      // 设置播放速率
      if (options.playbackRate) {
        source.playbackRate.value = Math.max(0.25, Math.min(4, options.playbackRate));
      }
      
      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  // 程序生成音效（作为备用）
  private playGeneratedSound(soundName: string, options: { volume?: number; playbackRate?: number } = {}): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 根据音效类型设置频率和音色
      const soundConfig = this.getGeneratedSoundConfig(soundName);
      oscillator.frequency.setValueAtTime(soundConfig.frequency, this.audioContext.currentTime);
      oscillator.type = soundConfig.waveType;
      
      // 设置音量包络
      const volume = (options.volume ?? 0.3) * this.config.volume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + soundConfig.duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + soundConfig.duration);
    } catch (error) {
      console.warn(`Failed to generate sound ${soundName}:`, error);
    }
  }

  private getGeneratedSoundConfig(soundName: string): {
    frequency: number;
    duration: number;
    waveType: OscillatorType;
  } {
    switch (soundName) {
      case 'click':
        return { frequency: 800, duration: 0.1, waveType: 'square' };
      case 'flag':
        return { frequency: 1200, duration: 0.15, waveType: 'triangle' };
      case 'unflag':
        return { frequency: 600, duration: 0.1, waveType: 'triangle' };
      case 'explosion':
        return { frequency: 150, duration: 0.5, waveType: 'sawtooth' };
      case 'win':
        return { frequency: 523, duration: 0.8, waveType: 'sine' };
      case 'reveal':
        return { frequency: 400, duration: 0.05, waveType: 'square' };
      case 'tick':
        return { frequency: 1000, duration: 0.03, waveType: 'square' };
      default:
        return { frequency: 440, duration: 0.1, waveType: 'sine' };
    }
  }

  // 播放胜利音效序列
  playWinSequence(): void {
    if (!this.config.enabled) return;

    // 播放一个欢快的音效序列
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    
    notes.forEach((frequency, index) => {
      setTimeout(() => {
        this.playTone(frequency, 0.2, 'sine');
      }, index * 200);
    });
  }

  // 播放爆炸音效序列
  playExplosionSequence(): void {
    if (!this.config.enabled) return;

    // 播放多层次的爆炸效果
    this.playSound('explosion');
    
    // 添加随机的小爆炸声
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(100 + Math.random() * 200, 0.1 + Math.random() * 0.2, 'sawtooth');
      }, i * 100 + Math.random() * 100);
    }
  }

  // 播放指定频率的音调
  private playTone(frequency: number, duration: number, waveType: OscillatorType = 'sine'): void {
    if (!this.audioContext || !this.config.enabled) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = waveType;
      
      const volume = 0.3 * this.config.volume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  }

  // 设置音量
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  // 获取当前音量
  getVolume(): number {
    return this.config.volume;
  }

  // 启用/禁用音效
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  // 检查音效是否启用
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // 获取配置
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  // 测试音效
  testSound(soundName: string = 'click'): void {
    this.playSound(soundName);
  }

  // 停止所有音效
  stopAll(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      // 创建一个新的AudioContext来强制停止所有音效
      this.audioContext.close();
      this.initializeAudioContext();
    }
  }
}

// 音效Hook
export function useAudio() {
  const audioManager = AudioManager.getInstance();
  
  return {
    playSound: (soundName: string, options?: { volume?: number; playbackRate?: number }) => 
      audioManager.playSound(soundName, options),
    playWinSequence: () => audioManager.playWinSequence(),
    playExplosionSequence: () => audioManager.playExplosionSequence(),
    setVolume: (volume: number) => audioManager.setVolume(volume),
    getVolume: () => audioManager.getVolume(),
    setEnabled: (enabled: boolean) => audioManager.setEnabled(enabled),
    isEnabled: () => audioManager.isEnabled(),
    getConfig: () => audioManager.getConfig(),
    testSound: (soundName?: string) => audioManager.testSound(soundName),
    preloadSounds: () => audioManager.preloadSounds()
  };
}

// 导出单例实例
export const audioManager = AudioManager.getInstance();
export default AudioManager;