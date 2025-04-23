const capturedData = {};

chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === "STORAGE_DATA") {
      const key = `tab_${sender.tab.id}_${Date.now()}`;
      await chrome.storage.local.set({
        [key]: {
          url: message.url,
          title: message.title,
          localStorage: message.localStorage,
          sessionStorage: message.sessionStorage,
          time: new Date().toLocaleString()
        }
      });
    }
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "INJECT_STORAGE") {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: (ls, ss, cookies) => {
          for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
          for (const [k, v] of Object.entries(ss)) sessionStorage.setItem(k, v);
          if (cookies) {
            for (const { name, value } of cookies) {
              document.cookie = `${name}=${value}; path=/`;
            }
          }
        },
        args: [message.localStorage, message.sessionStorage, message.cookies || []]
      });
      sendResponse({ success: true });
    }
  });
  

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CAPTURE_WITH_COOKIES") {
      chrome.cookies.getAll({ url: message.payload.url }, async (cookies) => {
        const key = `tab_${message.tabId}_${Date.now()}`;
        await chrome.storage.local.set({
          [key]: {
            ...message.payload,
            cookies,
            time: new Date().toLocaleString()
          }
        });
        sendResponse({ success: true });
      });
      return true; // Needed to use async sendResponse
    }
  });
  