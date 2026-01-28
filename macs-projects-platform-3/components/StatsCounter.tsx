import React, { useEffect, useState } from 'react';

interface StatsCounterProps {
  end: number;
  duration?: number;
  label: string;
}

const StatsCounter: React.FC<StatsCounterProps> = ({ end, duration = 2000, label }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const incrementTime = (duration / end) * 1000;
    
    // Simple logic for smaller numbers, for larger use requestAnimationFrame
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, duration / end);

    return () => clearInterval(timer);
  }, [end, duration]);

  return (
    <div className="flex flex-col items-center p-4 bg-macs-card/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg min-w-[150px]">
      <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
        {count}+
      </span>
      <span className="text-sm text-gray-400 font-medium tracking-wide mt-1">{label}</span>
    </div>
  );
};

export default StatsCounter;