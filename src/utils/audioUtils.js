// Audio utility functions for Sudoku game

// Create a pleasant completion sound using Web Audio API
export const createCompletionSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create a pleasant chord progression
  const playNote = (frequency, startTime, duration, volume = 0.1) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = 'sine';
    
    // Create a smooth envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };
  
  const now = audioContext.currentTime;
  
  // Play a pleasant C major chord progression
  // C major chord (C-E-G)
  playNote(523.25, now, 0.6, 0.08);      // C5
  playNote(659.25, now + 0.1, 0.5, 0.06); // E5
  playNote(783.99, now + 0.2, 0.4, 0.05); // G5
  
  // Add a subtle higher note for sparkle
  playNote(1046.50, now + 0.3, 0.3, 0.03); // C6
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
