// Filter out harmless preload warnings in development
(function () {
  // Only filter in development
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "development") {
    return;
  }
  const originalWarn = console.warn;
  console.warn = function (...args) {
    const message = args.join(" ");
    if (
      message.includes("preloaded using link preload but not used") ||
      (message.includes("was preloaded") && message.includes("not used"))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
  console.log("[ConsoleFilter] Development preload warning filter initialized");
})();

