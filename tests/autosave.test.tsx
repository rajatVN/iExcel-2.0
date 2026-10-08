// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useAutosave, type Values } from "@/components/assessment/useAutosave";

const SESSION = "00000000-0000-0000-0000-000000000001";
const blank = {
  priority: null,
  action_text: null,
  say_now_text: null,
  hold_text: null,
  say_hold_text: null,
  recommendation_text: null,
};
const initial: Values = { 1: { ...blank }, 2: { ...blank } };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, saved: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const sentChanges = () =>
  fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse(String((init as RequestInit).body)).changes as unknown[]) ?? []);

describe("useAutosave with Say now / Hold", () => {
  it("saves both fields as separate keys and mirrors them to localStorage", async () => {
    const { result } = renderHook(() => useAutosave({ sessionId: SESSION, initial, onLocked: () => {} }));
    act(() => {
      result.current.setField(1, "say_now_text", "Brief the supervisors");
      result.current.setField(1, "hold_text", "Savings figure");
    });
    const draft = JSON.parse(window.localStorage.getItem(`inbasket:pending:${SESSION}`)!);
    expect(draft["1"]).toEqual({ say_now_text: "Brief the supervisors", hold_text: "Savings figure" });

    await act(async () => {
      await result.current.flush();
    });
    expect(sentChanges()).toEqual([
      { itemId: 1, fields: { say_now_text: "Brief the supervisors", hold_text: "Savings figure" } },
    ]);
    expect(window.localStorage.getItem(`inbasket:pending:${SESSION}`)).toBeNull();
  });

  it("restores an unsynced draft of both fields on reload and syncs it", async () => {
    window.localStorage.setItem(
      `inbasket:pending:${SESSION}`,
      JSON.stringify({ 2: { say_now_text: "Call Meera", hold_text: "Nothing to hold" } }),
    );
    const onRecovered = vi.fn();
    const { result } = renderHook(() => useAutosave({ sessionId: SESSION, initial, onLocked: () => {}, onRecovered }));
    expect(result.current.values[2].say_now_text).toBe("Call Meera");
    expect(result.current.values[2].hold_text).toBe("Nothing to hold");
    expect(onRecovered).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(sentChanges()).toContainEqual({
        itemId: 2,
        fields: { say_now_text: "Call Meera", hold_text: "Nothing to hold" },
      }),
    );
  });
});
