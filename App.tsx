
import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- TYPE DEFINITIONS ---
interface Drip {
  x: number;
  y: number;
  char: string;
  life: number;
}

interface Row {
  y: number;
  speed: number;
  phase: number;
  drips: Drip[];
  xOffset: number;
}

// --- CONSTANTS ---
const PHRASE = "I Love You Princess ";
const COLORS = ["#00ff7f", "#00f87c", "#00f079", "#00e876", "#00e073", "#00d26a"];

// --- HELPER FUNCTIONS ---
const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;
const clamp = (num: number, min: number, max: number): number => Math.min(Math.max(num, min), max);

// --- CONTROLS COMPONENT ---
interface ControlsProps {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  glow: boolean;
  setGlow: (glow: boolean) => void;
}

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);

const Controls: React.FC<ControlsProps> = ({ isPaused, setIsPaused, speed, setSpeed, glow, setGlow }) => {
  return (
    <div className="absolute top-2 right-2 md:top-4 md:right-4 p-2 md:p-3 bg-black/50 backdrop-blur-sm rounded-lg text-xs text-[#00ff7f] z-10 select-none flex items-center gap-4 transition-opacity hover:opacity-100 opacity-70">
      <button onClick={() => setIsPaused(!isPaused)} title={isPaused ? "Play" : "Pause"} className="hover:text-white transition-colors">
        {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
      </button>

      <div className="flex items-center gap-2">
        <label htmlFor="speed">Speed:</label>
        <input
          id="speed"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-20"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="glow" className="cursor-pointer">Glow:</label>
        <button
          id="glow"
          onClick={() => setGlow(!glow)}
          className={`w-10 h-5 rounded-full transition-colors ${glow ? 'bg-[#00ff7f]' : 'bg-gray-700'}`}
        >
          <span className={`block w-4 h-4 m-0.5 bg-white rounded-full transform transition-transform ${glow ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Initialize useRef with a value. The error "Expected 1 arguments, but got 0" likely originates here, despite the reported line number being off.
  const animationFrameId = useRef<number | null>(null);
  const rows = useRef<Row[]>([]);
  const charSize = useRef({ width: 0, height: 0 });

  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [glow, setGlow] = useState(true);

  // Use refs to pass latest state to animation loop without re-triggering useEffect
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const glowRef = useRef(glow);
  useEffect(() => { glowRef.current = glow; }, [glow]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const fontSize = clamp(window.innerWidth / 80, 16, 24);
    ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`;
    const metrics = ctx.measureText("W");
    charSize.current = { width: metrics.width, height: fontSize };
    
    const rowCount = Math.floor(canvas.height / dpr / (charSize.current.height * 1.75));
    rows.current = [];
    for (let i = 0; i < rowCount; i++) {
      rows.current.push({
        y: (i + 1) * (charSize.current.height * 1.75),
        speed: getRandomFloat(0.3, 0.8),
        phase: getRandomFloat(0, Math.PI * 2),
        drips: [],
        xOffset: getRandomFloat(0, -2000),
      });
    }
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    animationFrameId.current = requestAnimationFrame(animate);

    if (isPausedRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Fading effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = `500 ${charSize.current.height}px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = "middle";

    if (glowRef.current) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ff7f80';
    } else {
        ctx.shadowBlur = 0;
    }

    const phraseWidth = charSize.current.width * PHRASE.length;
    const charsToFill = Math.ceil(width / charSize.current.width) + PHRASE.length;

    rows.current.forEach(row => {
      // Update row position
      row.xOffset -= row.speed * speedRef.current;
      if (row.xOffset < -phraseWidth) {
        row.xOffset += phraseWidth;
      }
      
      // Draw characters
      for (let i = 0; i < charsToFill; i++) {
        const charIndex = i % PHRASE.length;
        const char = PHRASE[charIndex];
        const baseX = row.xOffset + i * charSize.current.width;

        if (baseX < -charSize.current.width || baseX > width) continue;

        const wobble = Math.sin(baseX / 70 + row.phase) * (charSize.current.height / 5);
        const y = row.y + wobble;

        ctx.fillStyle = getRandom(COLORS);
        ctx.fillText(char, baseX, y);

        // Randomly create a drip
        if (Math.random() < 0.0005) {
          row.drips.push({ x: baseX, y, char, life: 30 });
        }
      }

      // Update and draw drips
      row.drips = row.drips.filter(drip => {
        drip.life--;
        if (drip.life <= 0) return false;
        
        ctx.globalAlpha = drip.life / 30;
        ctx.fillStyle = getRandom(COLORS);
        ctx.fillText(drip.char, drip.x, drip.y + (30 - drip.life) * 0.5);
        ctx.globalAlpha = 1;
        return true;
      });
    });
    
    // Reset shadow for next frame elements (like CRT effects)
    ctx.shadowBlur = 0;

    // Draw scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
    
    // Draw vignette
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.max(width, height) / 4, width / 2, height / 2, Math.max(width, height));
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

  }, []);

  useEffect(() => {
    setupCanvas();
    animationFrameId.current = requestAnimationFrame(animate);

    const handleResize = () => {
      setupCanvas();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCanvas, animate]);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <Controls
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        speed={speed}
        setSpeed={setSpeed}
        glow={glow}
        setGlow={setGlow}
      />
      <canvas ref={canvasRef} className="w-full h-full" />
    </main>
  );
};

export default App;
