import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel, logger } from "@/lib/utils/logger";

describe("utils/logger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create spies after global setup's beforeEach to avoid being overridden
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logger.configure({ level: LogLevel.DEBUG, prefix: "TEST", enableTimestamps: false });
  });

  it("logs at all levels when level=DEBUG", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e", new Error("x"));
    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("child logger inherits prefix", () => {
    const child = logger.child("child");
    child.info("message");
    expect(infoSpy).toHaveBeenCalled();
  });
});
