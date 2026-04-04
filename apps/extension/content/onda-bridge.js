// Bridge between onda dashboard and extension service worker
// Content scripts can talk to both the page (postMessage) and the service worker (runtime.sendMessage)

function sendWalletToPage() {
  chrome.runtime.sendMessage({ type: "GET_WALLET_INFO" }, (info) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({
      type: "ONDA_WALLET_INFO",
      extensionId: chrome.runtime.id,
      wallet: info || null,
    }, "*");
  });
}

function sendStatusToPage() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (status) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({
      type: "ONDA_STATUS",
      status: status || null,
    }, "*");
  });
}

// Send immediately on load
sendWalletToPage();
sendStatusToPage();

// Keep dashboard updated
setInterval(() => {
  sendWalletToPage();
  sendStatusToPage();
}, 10000);

// Listen for requests from the page
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "ONDA_REQUEST_WALLET_INFO") {
    sendWalletToPage();
  }

  if (event.data?.type === "ONDA_REQUEST_STATUS") {
    sendStatusToPage();
  }

  if (event.data?.type === "ONDA_APPROVE_AND_DEPOSIT") {
    chrome.runtime.sendMessage({ type: "APPROVE_AND_DEPOSIT" }, (result) => {
      if (chrome.runtime.lastError) return;
      window.postMessage({ type: "ONDA_DEPOSIT_RESULT", result }, "*");
    });
  }
});
