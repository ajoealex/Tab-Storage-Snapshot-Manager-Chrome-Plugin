const listContainer = document.getElementById("storage-list");
const captureBtn = document.getElementById("capture");

// Render saved sessions
function loadSessions() {
  listContainer.innerHTML = "";
  chrome.storage.local.get(null, (items) => {
    Object.entries(items).forEach(([key, data]) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="url">${data.url}</div>
        <div class="title">${data.title}</div>
        <div class="time">${data.time}</div>
        <button class="delete-btn" title="Delete">&times;</button>
      `;

      // Inject on card click (not the delete button)
      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("delete-btn")) injectToTab(data);
      });

      // Delete button
      card.querySelector(".delete-btn").addEventListener("click", () => {
        chrome.storage.local.remove(key, loadSessions);
      });

      listContainer.appendChild(card);
    });
  });
}

// Inject selected session into current tab
function injectToTab(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.runtime.sendMessage({
      type: "INJECT_STORAGE",
      tabId: tab.id,
      localStorage: data.localStorage,
      sessionStorage: data.sessionStorage,
      cookies: data.cookies || []
    }, (res) => {
      if (res.success) alert("Storage & cookies injected!");
    });
  });
}

// Capture current tab session
captureBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: location.href,
        title: document.title,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      })
    }, (results) => {
      const result = results[0].result;
  
      chrome.runtime.sendMessage({
        type: "CAPTURE_WITH_COOKIES",
        tabId: tab.id,
        payload: result
      }, () => loadSessions()); // Reload UI after storing
    });
  });
  

// Load on popup open
loadSessions();
