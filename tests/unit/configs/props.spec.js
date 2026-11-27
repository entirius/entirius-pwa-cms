import { describe, it, expect } from "vitest";
import props from "../../../__client_default/props/__props.json";
import en from "../../../src/i18n/locales/en.json";
import pl from "../../../src/i18n/locales/pl.json";

const prop = (name) => props.find((p) => p.prop === name);
const sectionTypes = (name) =>
  prop(name)._for.section_configs.flatMap((c) => c.variants_group.flat());

describe("Video section props", () => {
  it("keeps the raw video link as a text prop", () => {
    expect(prop("video_field").type).toBe("text");
    expect(sectionTypes("video_field")).toContain("core_type:section-video");
  });

  it("offers the images prop (optional cover) on the Video section, as on the banners", () => {
    expect(prop("images_set").type).toBe("images");
    expect(sectionTypes("images_set")).toEqual(
      expect.arrayContaining([
        "core_type:section-banner",
        "core_type:section-mini-banner",
        "core_type:section-video",
      ])
    );
  });

  it("labels every prop in en and pl", () => {
    for (const { prop: name } of props) {
      expect(en.prop[name], `en ${name}`).toBeTruthy();
      expect(pl.prop[name], `pl ${name}`).toBeTruthy();
    }
  });
});
