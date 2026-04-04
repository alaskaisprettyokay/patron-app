// Bridge between Patron dashboard and extension service worker
// Content scripts can talk to both the page (postMessage) and the service worker (runtime.sendMessage)

function sendWalletToPage() {
  chrome.runtime.sendMessage({ type: "GET_WALLET_INFO" }, (info) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({
      type: "PATRON_WALLET_INFO",
      extensionId: chrome.runtime.id,
      wallet: info || null,
    }, "*");
  });
}

function sendStatusToPage() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (status) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({
      type: "PATRON_STATUS",
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

  if (event.data?.type === "PATRON_REQUEST_WALLET_INFO") {
    sendWalletToPage();
  }

  if (event.data?.type === "PATRON_REQUEST_STATUS") {
    sendStatusToPage();
  }

  // Setup flow: dashboard can trigger setup completion
  if (event.data?.type === "PATRON_COMPLETE_SETUP") {
    chrome.runtime.sendMessage(
      { type: "COMPLETE_SETUP", data: event.data.data },
      (result) => {
        if (chrome.runtime.lastError) return;
        window.postMessage({ type: "PATRON_SETUP_RESULT", result }, "*");
        // Refresh wallet info after setup
        sendWalletToPage();
      }
    );
  }

  // Deprecated: kept for backward compatibility during migration
  if (event.data?.type === "PATRON_APPROVE_AND_DEPOSIT") {
    chrome.runtime.sendMessage({ type: "APPROVE_AND_DEPOSIT" }, (result) => {
      if (chrome.runtime.lastError) return;
      window.postMessage({ type: "PATRON_DEPOSIT_RESULT", result }, "*");
    });
  }
});
