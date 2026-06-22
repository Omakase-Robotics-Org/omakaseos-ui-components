/**
 * @file v0.6 aui surface contract — public exports of the new
 * `@omakase-robotics/ui-components/aui` sub-entry.
 *
 * This is the red half of the t-wada red→green discipline for the
 * canonical assistant-ui primitives lift (see
 * `omksos_web/reports/ui-components-aui-canonical-lift/README.md`).
 * Until `src/aui/index.ts` exists and exports the named symbols, this
 * file fails to type-check and to import.
 *
 * The contract is defined here, not in implementation, on purpose:
 * the PoC-side `assistant-ui-replacement-poc/app/` and the body-side
 * `source/packages/web/src/apps/customer/routes/conversations/` will
 * both consume these names, so any rename is a breaking change visible
 * here first.
 */
import { describe, expect, it } from "vitest";
import * as Aui from "../src/aui";

describe("@omakase-robotics/ui-components/aui — v0.6 public surface", () => {
  it("exports the canonical Thread shell", () => {
    expect(typeof Aui.Thread).toBe("function");
  });

  it("exports the canonical MarkdownText renderer", () => {
    expect(typeof Aui.MarkdownText).toBe("object");
  });

  it("exports tool-call primitives", () => {
    // ToolFallback is a memo()-wrapped composite (object) carrying the
    // `.Root` / `.Trigger` / `.Content` / `.Args` / `.Result` / `.Error`
    // / `.Approval` slots from the upstream registry component. The
    // unwrapped Group primitives are plain function components.
    expect(typeof Aui.ToolFallback).toBe("object");
    expect(typeof Aui.ToolGroupRoot).toBe("function");
    expect(typeof Aui.ToolGroupTrigger).toBe("function");
    expect(typeof Aui.ToolGroupContent).toBe("function");
  });

  it("exports reasoning primitives", () => {
    // `Reasoning` is a memo()-wrapped composite (object). The Root /
    // Trigger / Content / Text slots are plain function components,
    // matching the upstream shadcn registry shape.
    expect(typeof Aui.Reasoning).toBe("object");
    expect(typeof Aui.ReasoningRoot).toBe("function");
    expect(typeof Aui.ReasoningTrigger).toBe("function");
    expect(typeof Aui.ReasoningContent).toBe("function");
    expect(typeof Aui.ReasoningText).toBe("function");
  });

  it("exports composer attachment primitives", () => {
    expect(typeof Aui.ComposerAddAttachment).toBe("function");
    expect(typeof Aui.ComposerAttachments).toBe("function");
    expect(typeof Aui.UserMessageAttachments).toBe("function");
  });

  it("exports the TooltipIconButton primitive used inside the surface", () => {
    expect(typeof Aui.TooltipIconButton).toBe("object");
  });

  it("exports the voice surface (VoiceOrb + control affordances)", () => {
    // VoiceOrb is wrapped in `memo`, which yields an object whose
    // `.type` is a function (the inner FC). The control affordances are
    // plain function components.
    expect(typeof Aui.VoiceOrb).toBe("object");
    expect(typeof Aui.VoiceControl).toBe("function");
    expect(typeof Aui.deriveVoiceOrbState).toBe("function");
  });

  it("exports the cn className helper", () => {
    expect(typeof Aui.cn).toBe("function");
    expect(Aui.cn("a", false, "b")).toBe("a b");
  });
});
