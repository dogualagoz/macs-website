import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * StatsCounter Component
 * Animated counter with gradient text effect
 */
const StatsCounter = ({ end, duration = 2000, label }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Veri gelene kadar animasyonu başlatma
    if (end <= 0 || hasAnimated) return;
    
    let start = 0;
    const incrementTime = Math.max(duration / end, 10); // Min 10ms
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        clearInterval(timer);
        setHasAnimated(true);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [end, duration, hasAnimated]);

  // end değişirse animasyonu sıfırla (yeni veri geldiğinde)
  useEffect(() => {
    if (end > 0 && hasAnimated && count !== end) {
      setCount(end); // Direkt son değere atla
    }
  }, [end, hasAnimated, count]);

  return (
    <div className="flex flex-col items-center p-4 bg-macs-card/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg min-w-[150px]">
      <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
        {end > 0 ? `${count}+` : '...'}
      </span>
      <span className="text-sm text-gray-400 font-medium tracking-wide mt-1">{label}</span>
    </div>
  );
};

StatsCounter.propTypes = {
  end: PropTypes.number.isRequired,
  duration: PropTypes.number,
  label: PropTypes.string.isRequired
};

StatsCounter.defaultProps = {
  duration: 2000
};

export default StatsCounter;
