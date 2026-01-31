import React from 'react';
import { motion, AnimatePresence } from "framer-motion";

/**
 * LogoLoader Component
 * Modern, premium loading screen with MACS logo and glow effects
 */
const LogoLoader = ({ isLoading }) => {
  return (
    <AnimatePresence>
      {isLoading && (
          <motion.div 
          className="logo-loader-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#FFFFFF', // Clean white background
            position: 'fixed' ,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999
          }}
        >
          <div className="relative">
            {/* Soft Glow Effect (Subtle for white theme) */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(40px)',
                zIndex: -1
              }}
            />

            {/* Main Logo Container */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
              }}
              transition={{ 
                scale: { duration: 0.6, ease: "easeOut" },
                opacity: { duration: 0.4 }
              }}
            >
              {/* Floating Animation */}
              <motion.div
                animate={{ 
                  y: [0, -20, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <img 
                  src="/assets/images/macs.png" 
                  alt="MACS Logo" 
                  style={{ 
                    width: '220px', // Increased size
                    height: 'auto',
                    filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.08))'
                  }} 
                />
              </motion.div>
            </motion.div>

            {/* Prominent Progress Bar */}
            <div
              style={{
                width: '180px',
                height: '4px',
                background: '#f1f5f9', // Light gray track
                borderRadius: '10px',
                marginTop: '50px',
                overflow: 'hidden',
                margin: '50px auto 0',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: 1.5,
                    ease: "easeInOut"
                  }}
                  style={{
                    height: '100%',
                    background: '#2563eb', // Solid blue for filling
                    borderRadius: '10px'
                  }}
                />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LogoLoader;
