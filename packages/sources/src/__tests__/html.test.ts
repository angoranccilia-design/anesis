import { describe, expect, it } from "vitest";
import { countMarketingMentions, detectOtaBadges, hasTrackingPixel, htmlSource } from "../html.js";
import { fakeHttp } from "./fake-http.js";

describe("htmlSource — badges OTA, pixel, mentions marketing", () => {
  it("détecte un lien Booking, un pixel de suivi et une mention marketing", async () => {
    const html = `<html><a href="https://www.booking.com/hotel/x">Book</a>
      <p>Our team — Jane, Head of Marketing</p>
      <script>gtag('config','G-XXX')</script></html>`;
    const http = fakeHttp({ get: () => ({ status: 200, body: html }) });
    const out = await htmlSource().collect({ id: "p", name: "P", website: "https://p.co.uk" }, { http });
    expect(out.otaBadges).toContain("booking.com");
    expect(out.teamPageMarketingMentions).toBeGreaterThan(0);
    expect(out.hasTrackingPixel).toBe(true);
  });

  it("fonctions unitaires", () => {
    expect(detectOtaBadges("... expedia.com/… tripadvisor.co.uk …")).toEqual(expect.arrayContaining(["expedia", "tripadvisor"]));
    expect(countMarketingMentions("responsable marketing chez nous")).toBe(1);
    expect(hasTrackingPixel("<script src='googletagmanager.com/gtm.js'>")).toBe(true);
    expect(hasTrackingPixel("<p>no tracking here</p>")).toBe(false);
  });
});
