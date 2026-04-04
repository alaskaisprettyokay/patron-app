// Bridge between onda dashboard and extension service worker
// Content scripts can talk to both the page (postMessage) and the service worker (runtime.sendMessage)

function sendWalletToPage() {
  chrome.runtime.sendMessage({ type: "GET_ACCOUNT_STATUS" }, (status) => {
    if (chrome.runtime.lastError || !status) return;
    // Forward smart account address as the "wallet" the dashboard funds
    const wallet = status.smartAccountAddress
      ? { address: status.smartAccountAddress, usdcBalance: "0", escrowBalance: "0" }
      : null;
    window.postMessage({
      type: "ONDA_WALLET_INFO",
      extensionId: chrome.runtime.id,
      wallet,
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

  if (event.data?.type === "ONDA_VERIFY_SOUNDCLOUD") {
    const { url, code, mbid } = event.data;
    chrome.runtime.sendMessage(
      { type: "ONDA_VERIFY_SOUNDCLOUD", data: { url, code, mbid } },
      (result) => {
        window.postMessage({
          type: "ONDA_VERIFY_SOUNDCLOUD_RESULT",
          result: result || { error: "No response from extension" },
        }, "*");
      }
    );
  }

});
