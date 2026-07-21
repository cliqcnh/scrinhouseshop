import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { normalizePhoneNumber, sendSMS, sendEmail } from "@/lib/notifications";

describe("normalizePhoneNumber", () => {
  it("leaves already normalized numbers as is", () => {
    expect(normalizePhoneNumber("233241234567")).toBe("233241234567");
  });

  it("removes leading plus symbol", () => {
    expect(normalizePhoneNumber("+233241234567")).toBe("233241234567");
  });

  it("converts leading zero format to international format", () => {
    expect(normalizePhoneNumber("0241234567")).toBe("233241234567");
  });

  it("converts 9 digit numbers to international format", () => {
    expect(normalizePhoneNumber("241234567")).toBe("233241234567");
  });

  it("ignores non-numeric characters", () => {
    expect(normalizePhoneNumber("024-123-4567")).toBe("233241234567");
  });
});

describe("sendSMS API call", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("uses mock logger if SMS_API_KEY is not defined", async () => {
    process.env.SMS_API_KEY = "";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const success = await sendSMS("0241234567", "Test Message");
    expect(success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("calls Wigal Frog SMS API if WIGAL_API_KEY is defined", async () => {
    process.env.WIGAL_API_KEY = "wigal-test-key";
    process.env.SMS_SENDER_ID = "ScrinHouseGH";

    const mockFetch = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: async () => "SUCCESS",
    } as Response);

    const success = await sendSMS("0241234567", "Wigal Test Message");
    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://sms.wigal.com.gh/api/v2/send_sms",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Authorization": "Bearer wigal-test-key",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          key: "wigal-test-key",
          sender: "ScrinHouseGH",
          destinations: ["233241234567"],
          to: "233241234567",
          message: "Wigal Test Message",
        }),
      })
    );
  });

  it("calls Arkesel SMS API if SMS_API_KEY is defined", async () => {
    process.env.WIGAL_API_KEY = "";
    process.env.SMS_API_KEY = "test-api-key";
    process.env.SMS_SENDER_ID = "ScrinHouseTest";

    const mockFetch = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: async () => "OK",
    } as Response);

    const success = await sendSMS("0241234567", "Real Test Message");
    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://sms.arkesel.com/api/v2/sms/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "api-key": "test-api-key",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          sender: "ScrinHouseTest",
          message: "Real Test Message",
          recipients: ["233241234567"],
        }),
      })
    );
  });
});

describe("sendEmail API call", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("uses mock logger if RESEND_API_KEY is not defined", async () => {
    process.env.RESEND_API_KEY = "";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const success = await sendEmail("customer@example.com", "Subject", "<p>Html</p>");
    expect(success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("calls Resend API if RESEND_API_KEY is defined", async () => {
    process.env.RESEND_API_KEY = "resend-api-key";
    process.env.EMAIL_FROM = "ScrinHouse Test <test@scrinhouse.com>";

    const mockFetch = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      text: async () => "OK",
    } as Response);

    const success = await sendEmail("customer@example.com", "Welcome", "<p>Hello</p>");
    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Authorization": "Bearer resend-api-key",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          from: "ScrinHouse Test <test@scrinhouse.com>",
          to: ["customer@example.com"],
          subject: "Welcome",
          html: "<p>Hello</p>",
        }),
      })
    );
  });
});
