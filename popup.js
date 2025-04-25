const listContainer = document.getElementById("storage-list");
const captureBtn = document.getElementById("capture");
const domainInput = document.getElementById("cookieDomains");
const addDomainBtn = document.getElementById("addDomainBtn");
const domainListDisplay = document.getElementById("domainList");

let domainSet = new Set();

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

      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("delete-btn")) injectToTab(data);
      });

      card.querySelector(".delete-btn").addEventListener("click", () => {
        chrome.storage.local.remove(key, loadSessions);
      });

      listContainer.appendChild(card);
    });
  });
}

// Inject session into tab
function injectToTab(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.runtime.sendMessage({
      type: "INJECT_STORAGE",
      tabId: tab.id,
      localStorage: data.localStorage,
      sessionStorage: data.sessionStorage,
      cookies: data.cookies || []
    }, (res) => {
      if (res?.success) alert("Storage & cookies injected!");
    });
  });
}

// Update domain list UI
function updateDomainListDisplay() {
  const html = Array.from(domainSet).map(d => `<div>${d}</div>`).join('');
  domainListDisplay.innerHTML = `<strong>Domains to capture cookies:</strong>${html}`;
}

// Set default base domain on popup open
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const url = new URL(tab.url);
  domainInput.value = '.*'+url.hostname.replace('www.','')+".*";
});

// Add cookie domain
addDomainBtn.addEventListener("click", () => {
  const domains = domainInput.value.split("\n").map(d => d.trim()).filter(Boolean);
  domains.forEach(d => domainSet.add(d));
  updateDomainListDisplay();
  domainInput.value = ""; // Clear input after add
});

// Capture session
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
      payload: result,
      cookieDomains: Array.from(domainSet)
    }, () => loadSessions());
  });
});

// Initial load
loadSessions();
