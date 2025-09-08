// Audio utility functions for Sudoku game

// Create a celebratory victory sound using Web Audio API
export const createCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a note with optional harmonic and reverb effect
    const playNote = (frequency, startTime, duration, volume = 0.1, type = 'sine', harmonic = false) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = type;
      
      // Create a smooth envelope with a celebratory feel
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, startTime + duration * 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
      
      // Add harmonic for richer sound
      if (harmonic) {
        const harmonicOsc = audioContext.createOscillator();
        const harmonicGain = audioContext.createGain();
        
        harmonicOsc.connect(harmonicGain);
        harmonicGain.connect(audioContext.destination);
        
        harmonicOsc.frequency.setValueAtTime(frequency * 2, startTime);
        harmonicOsc.type = 'triangle';
        
        harmonicGain.gain.setValueAtTime(0, startTime);
        harmonicGain.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.02);
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        harmonicOsc.start(startTime);
        harmonicOsc.stop(startTime + duration);
      }
    };
    
    const now = audioContext.currentTime;
    
    // 🎉 VICTORY SOUND - Quick celebration
    
    // Opening chord (C Major)
    playNote(261.63, now, 0.2, 0.12, 'sine', true);    // C4
    playNote(329.63, now + 0.01, 0.18, 0.10, 'sine');  // E4
    playNote(392.00, now + 0.02, 0.16, 0.08, 'sine');  // G4
    
    // Rising melody - "Victory!"
    playNote(523.25, now + 0.15, 0.15, 0.14, 'triangle');  // C5
    playNote(659.25, now + 0.25, 0.15, 0.16, 'triangle');  // E5
    playNote(783.99, now + 0.35, 0.15, 0.18, 'triangle');  // G5
    playNote(1046.50, now + 0.45, 0.25, 0.2, 'triangle');  // C6 - peak!
    
    // Quick sparkle
    playNote(1318.51, now + 0.6, 0.15, 0.12, 'sine');     // E6
    playNote(2093.00, now + 0.7, 0.2, 0.08, 'sine');      // C7 - sparkle
    
  } catch (error) {
    // Silently fail if audio context isn't available
    console.log('Victory sound not available:', error);
  }
};

// Create different sounds for different types of completions
export const createRowCompletionSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playNote = (frequency, startTime, duration, volume = 0.15, type = 'sine') => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };
  
  const now = audioContext.currentTime;
  
  // Triumphant ascending progression - "YES!"
  playNote(523.25, now, 0.12, 0.12);        // C5
  playNote(659.25, now + 0.06, 0.12, 0.14); // E5
  playNote(783.99, now + 0.12, 0.18, 0.16); // G5
  playNote(1046.50, now + 0.18, 0.25, 0.12); // C6 - triumphant finish
};

export const createColumnCompletionSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playNote = (frequency, startTime, duration, volume = 0.15, type = 'sine') => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };
  
  const now = audioContext.currentTime;
  
  // Confident "ding-ding-DING!" progression
  playNote(659.25, now, 0.1, 0.12);         // E5
  playNote(783.99, now + 0.08, 0.1, 0.14);  // G5
  playNote(1046.50, now + 0.16, 0.3, 0.16); // C6 - strong finish
};

export const createBoxCompletionSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playNote = (frequency, startTime, duration, volume = 0.15, type = 'sine') => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };
  
  const now = audioContext.currentTime;
  
  // Powerful "TA-DA!" chord progression - most celebratory
  playNote(523.25, now, 0.15, 0.12);         // C5
  playNote(659.25, now + 0.02, 0.15, 0.14);  // E5
  playNote(783.99, now + 0.04, 0.15, 0.16);  // G5
  
  // Big finish with higher octave
  playNote(1046.50, now + 0.15, 0.4, 0.18);  // C6 - triumphant
  playNote(1318.51, now + 0.17, 0.35, 0.12); // E6 - sparkle
};

// Play completion sound based on what was completed
export const playCompletionSound = (completedSections) => {
  try {
    // If multiple sections completed, play the most satisfying sound
    if (completedSections.boxes.length > 0) {
      createBoxCompletionSound();
    } else if (completedSections.rows.length > 0 && completedSections.columns.length > 0) {
      // Both row and column - play a combined sound
      createCompletionSound();
    } else if (completedSections.rows.length > 0) {
      createRowCompletionSound();
    } else if (completedSections.columns.length > 0) {
      createColumnCompletionSound();
    }
  } catch (error) {
    // Silently fail if audio context isn't available
    console.log('Audio not available:', error);
  }
};

// Create a more elaborate sound for multiple completions
export const playMultipleCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playNote = (frequency, startTime, duration, volume = 0.15, type = 'sine') => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // EPIC "ACHIEVEMENT UNLOCKED!" fanfare
    // First chord - powerful start
    playNote(523.25, now, 0.2, 0.14);      // C5
    playNote(659.25, now + 0.01, 0.2, 0.16); // E5
    playNote(783.99, now + 0.02, 0.2, 0.18); // G5
    
    // Rising sequence - building excitement
    playNote(1046.50, now + 0.15, 0.15, 0.16); // C6
    playNote(1174.66, now + 0.22, 0.15, 0.14); // D6
    playNote(1318.51, now + 0.29, 0.15, 0.15); // E6
    
    // Grand finale - triumphant finish
    playNote(1567.98, now + 0.4, 0.4, 0.2);   // G6 - victory!
    playNote(2093.00, now + 0.42, 0.35, 0.12); // C7 - sparkle
  } catch (error) {
    console.log('Audio not available:', error);
  }
};

// Create an extra special victory sound for perfect games and new records
export const createPerfectGameSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playNote = (frequency, startTime, duration, volume = 0.15, type = 'sine', detune = 0) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.detune.setValueAtTime(detune, startTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.6, startTime + duration * 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // 🏆 PERFECT GAME CELEBRATION - Quick epic fanfare
    
    // Triumphant opening chord
    playNote(130.81, now, 0.4, 0.08, 'sawtooth');        // C3 - bass
    playNote(261.63, now + 0.01, 0.35, 0.12, 'triangle'); // C4
    playNote(329.63, now + 0.02, 0.3, 0.10, 'triangle');  // E4
    playNote(523.25, now + 0.03, 0.25, 0.12, 'sine');     // C5
    
    // Victory melody - "PERFECT!"
    playNote(659.25, now + 0.2, 0.15, 0.16, 'triangle');   // E5
    playNote(783.99, now + 0.3, 0.15, 0.18, 'triangle');   // G5
    playNote(1046.50, now + 0.4, 0.2, 0.2, 'triangle');    // C6 - peak!
    
    // Quick sparkle cascade
    playNote(1318.51, now + 0.55, 0.12, 0.14, 'sine', 10); // E6
    playNote(1567.98, now + 0.62, 0.12, 0.12, 'sine', -5); // G6
    playNote(2093.00, now + 0.7, 0.15, 0.12, 'sine', -10); // C7
    
    // Final chord burst
    playNote(523.25, now + 0.8, 0.3, 0.16, 'sine');      // C5
    playNote(659.25, now + 0.81, 0.28, 0.14, 'sine');    // E5
    playNote(783.99, now + 0.82, 0.26, 0.12, 'sine');    // G5
    playNote(1046.50, now + 0.83, 0.24, 0.10, 'sine');   // C6
    
  } catch (error) {
    console.log('Perfect game sound not available:', error);
  }
};

// Create a gentle hint sound for auto-hints
export const createHintSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playNote = (frequency, startTime, duration, volume = 0.08, type = 'sine') => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = type;
      
      // Gentle envelope for a soft, pleasant sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, startTime + duration * 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // 💡 GENTLE HINT SOUND - Soft "ding-dong" chime
    // Two-tone chime that's pleasant but not intrusive
    playNote(659.25, now, 0.4, 0.06, 'sine');      // E5 - first chime
    playNote(523.25, now + 0.15, 0.5, 0.08, 'sine'); // C5 - second chime (lower, warmer)
    
    // Optional subtle harmonic for richness
    playNote(783.99, now + 0.02, 0.3, 0.03, 'triangle'); // G5 - very soft harmonic
    
  } catch (error) {
    console.log('Hint sound not available:', error);
  }
};

// Create a digit completion sound (similar to row/column completion)
export const createDigitCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playNote = (frequency, startTime, duration, volume = 0.15, type = 'sine') => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // 🔢 DIGIT COMPLETION SOUND - "All done!" progression
    // Similar to row/column but with a unique ascending pattern
    playNote(523.25, now, 0.1, 0.12);         // C5
    playNote(659.25, now + 0.06, 0.1, 0.14);  // E5
    playNote(783.99, now + 0.12, 0.15, 0.16); // G5
    playNote(1046.50, now + 0.18, 0.2, 0.14); // C6 - satisfying finish
    
  } catch (error) {
    console.log('Digit completion sound not available:', error);
  }
};
