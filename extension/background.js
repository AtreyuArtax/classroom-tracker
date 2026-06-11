// Service Worker for Classroom Tracker Scanner Router Extension

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WEDGE_SCAN') {
    // Query all open browser tabs
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        // Find any tab running Classroom Tracker (local development or deployed host name)
        if (tab.url && (
          tab.url.includes('classroom-tracker') || 
          tab.url.includes('localhost:') || 
          tab.url.includes('127.0.0.1:')
        )) {
          // Send the card code to the Classroom Tracker tab
          chrome.tabs.sendMessage(tab.id, { type: 'TRACKER_INPUT_SCAN', code: message.code }).catch(() => {
            // Ignore error for unloaded or unresponsive tabs
          });
        }
      }
    });
  }
});
