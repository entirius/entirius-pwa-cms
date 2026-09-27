import { describe, it, expect } from "vitest";
import { findIconDefinition } from "@fortawesome/fontawesome-svg-core";
import registerFontAwesome from "@/boots/Icons/fa-icons";
import { ICONS } from "@/boots/Icons/icons";

const app = { component: () => {}, config: { globalProperties: {} } };
registerFontAwesome(app);

describe("icon meaning registry", () => {
  it("points every meaning at a glyph registered in fa-icons.js", () => {
    const unregistered = Object.entries(ICONS).filter(
      ([, iconName]) => !findIconDefinition({ prefix: "fas", iconName })
    );
    expect(unregistered).toEqual([]);
  });

  it("gives every glyph one meaning", () => {
    // A plain reduce, not Object.groupBy: the CMS supports Node 20 (engines).
    const meaningsOf = Object.keys(ICONS).reduce(
      (groups, meaning) => ({ ...groups, [ICONS[meaning]]: [...(groups[ICONS[meaning]] ?? []), meaning] }),
      {}
    );
    const shared = Object.values(meaningsOf).filter((meanings) => meanings.length > 1);
    expect(shared).toEqual([]);
  });

  it("is frozen and reaches templates as $icons", () => {
    expect(Object.isFrozen(ICONS)).toBe(true);
    expect(app.config.globalProperties.$icons).toBe(ICONS);
  });
});
