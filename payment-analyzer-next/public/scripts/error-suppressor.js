// Suppress noisy browser extension errors
(function () {
  window.addEventListener(
    "unhandledrejection",
    function (event) {
      if (!event.reason) return;
      const error = event.reason;
      const message = typeof error === "object" && error.message ? error.message : String(error);
      const stack = typeof error === "object" && error.stack ? error.stack : "";
      const isExtensionError =
        stack.includes("content.js") ||
        stack.includes("_storageChangeDispatcher") ||
        stack.includes("_storageChangeDispatcherCallback") ||
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        (message.includes("[object Object]") && message.includes("not valid JSON"));
      if (isExtensionError) {
        event.preventDefault();
        return;
      }
    },
    true,
  );

  window.addEventListener(
    "error",
    function (event) {
      const message = event.message || "";
      const filename = event.filename || "";
      const isExtensionError =
        message.includes("runtime.lastError") ||
        message.includes("chrome-extension") ||
        message.includes("moz-extension") ||
        filename.includes("content.js") ||
        filename.includes("chrome-extension") ||
        filename.includes("moz-extension");
      if (isExtensionError) {
        event.preventDefault();
        return;
      }
    },
    true,
  );

  console.log("[ErrorSuppressor] Browser extension error suppressor initialized");
})();

