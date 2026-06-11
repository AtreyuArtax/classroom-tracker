// Content Script for Classroom Tracker Scanner Router Extension

// Listen for scans forwarded from the service worker (specific to the Classroom Tracker page)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRACKER_INPUT_SCAN') {
    // Dispatch a custom event to the web page's window context
    window.dispatchEvent(new CustomEvent('classroom-tracker-scan', { detail: message.code }));
  }
});

let lastKeyTime = 0;
let scanBuffer = [];
let isCapturingScan = false;

window.addEventListener('keydown', (e) => {
  // If we are on the Classroom Tracker page itself, do not intercept keystrokes here
  // because the app's native useKeyboardWedge will handle keyboard scans directly.
  if (window.location.href.includes('classroom-tracker') || 
      window.location.href.includes('localhost:') || 
      window.location.href.includes('127.0.0.1:')) {
    return;
  }

  const now = Date.now();
  const timeDiff = now - lastKeyTime;
  lastKeyTime = now;

  // Normal human typing is rarely faster than 50ms per key.
  // RFID scanners type at extremely high speed (typically ~1ms to 15ms per key).
  const isSpeedy = timeDiff < 35;

  if (isSpeedy || isCapturingScan) {
    isCapturingScan = true;
    
    // Block keystrokes from propagating to the active slide deck/web page
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Enter') {
      const code = scanBuffer.join('');
      if (code.length >= 4) {
        chrome.runtime.sendMessage({ type: 'WEDGE_SCAN', code });
      }
      
      // Clean up the first character if it leaked into a text field
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        const input = document.activeElement;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;
        const firstChar = code[0];
        if (start > 0 && val[start - 1] === firstChar) {
          input.value = val.substring(0, start - 1) + val.substring(end);
          input.setSelectionRange(start - 1, start - 1);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      
      scanBuffer = [];
      isCapturingScan = false;
    } else if (e.key.length === 1) {
      scanBuffer.push(e.key);
    }
  } else {
    // Store key as potential start of a rapid scan sequence
    scanBuffer = [e.key];
  }
}, true); // Using capture phase to intercept keys before page event handlers
