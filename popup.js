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
      card.className = "bg-white p-3 rounded-lg shadow hover:shadow-md transition relative cursor-pointer";
      card.innerHTML = `
      <div class="p-2 max-w-[310px]">
        <div class="url font-semibold text-blue-700 text-sm break-all mb-1">${data.url}</div>
        <div class="title text-gray-600 text-sm truncate">${data.title}</div>
        <div class="time text-gray-400 text-xs">${data.time}</div>
      </div>        
      <button  class="delete-btn absolute top-5 right-2 w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition font-bold"  title="Delete">  &times;</button>
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
  const html = Array.from(domainSet)
    .map(d => `<div class="bg-blue-50 text-blue-800 text-sm px-2 py-1 rounded mb-1">${d}</div>`)
    .join('');
  domainListDisplay.innerHTML = '<strong class="block mb-1 text-sm text-gray-700">Domains to capture cookies:</strong>' + html;
}

// Set default base domain on popup open
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const url = new URL(tab.url);
  domainInput.value = '.*' + url.hostname.replace('www.', '') + ".*";
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
