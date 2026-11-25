import { describe, expect, it } from "vitest";

import { bindDictation, dictationErrorMessage, joinDictation, spokenText, type DictationEngine } from "./dictation";

describe("joinDictation", () => {
  it("appends the phrase heard so far without repeating the earlier words", () => {
    expect(joinDictation("hola", "qué insumos", 2_000)).toBe("hola qué insumos");
    expect(joinDictation("hola", "qué insumos son", 2_000)).toBe("hola qué insumos son");
  });

  it("keeps the box as it was when nothing was heard", () => {
    expect(joinDictation("  hola  ", "   ", 2_000)).toBe("hola");
  });

  it("stops at the question limit", () => {
    expect(joinDictation("", "abcdefghij", 4)).toBe("abcd");
  });
});

describe("dictationErrorMessage", () => {
  it("stays quiet when the user stops the microphone", () => {
    expect(dictationErrorMessage("aborted")).toBeNull();
  });

  it("explains a blocked microphone", () => {
    expect(dictationErrorMessage("not-allowed")).toContain("micrófono");
  });
});

describe("bindDictation", () => {
  it("writes the whole phrase in Spanish and reports the end", () => {
    const heard: string[] = [];
    let ended = 0;
    const engine = fakeEngine();

    bindDictation(engine, {
      onTranscript: (spoken) => heard.push(spoken),
      onEnd: () => {
        ended += 1;
      },
      onError: () => undefined,
    });

    engine.onresult?.({
      results: [{ 0: { transcript: "cuántos " } }, { 0: { transcript: "productos" } }],
    });
    engine.onend?.();

    expect(engine.lang).toBe("es-AR");
    expect(engine.interimResults).toBe(true);
    expect(spokenText([{ 0: { transcript: "hola" } }])).toBe("hola");
    expect(heard).toEqual(["cuántos productos"]);
    expect(ended).toBe(1);
  });
});

function fakeEngine(): DictationEngine {
  return {
    lang: "",
    continuous: true,
    interimResults: false,
    start: () => undefined,
    stop: () => undefined,
    onresult: null,
    onerror: null,
    onend: null,
  };
}
