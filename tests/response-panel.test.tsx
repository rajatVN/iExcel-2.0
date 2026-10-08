// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { items } from "@/content/drishti";
import { ResponsePanel, itemState } from "@/components/assessment/ResponsePanel";
import type { Fields } from "@/components/assessment/useAutosave";

const empty: Fields = {
  priority: null,
  action_text: null,
  say_now_text: null,
  hold_text: null,
  say_hold_text: null,
  recommendation_text: null,
};

afterEach(cleanup);

describe("ResponsePanel – Items 1 to 8", () => {
  const standard = items.filter((it) => it.responseType !== "recommendation");

  it("covers Items 1 to 8", () => {
    expect(standard.map((it) => it.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each(standard.map((it) => [it.id, it] as const))("Item %i shows Say now and Hold side by side", (_, item) => {
    render(<ResponsePanel item={item} value={empty} disabled={false} onChange={() => {}} />);

    const group = screen.getByRole("group", { name: "Say now / Hold" });
    expect(
      within(group).getByText(
        "What will you communicate now, and what will you deliberately not say or commit yet? (1 line each)",
      ),
    ).toBeTruthy();

    const sayNow = within(group).getByLabelText("Say now") as HTMLTextAreaElement;
    const hold = within(group).getByLabelText("Hold") as HTMLTextAreaElement;
    expect(sayNow.placeholder).toBe("Who, and what you’ll say…");
    expect(hold.placeholder).toBe("What you’ll hold back, and why (or “Nothing to hold”)…");

    // One row: single column by default (narrow, stacked), two equal columns once the form is wide enough.
    const row = within(group).getByTestId("sayhold-row");
    expect(row.className.split(" ")).toEqual(expect.arrayContaining(["grid", "grid-cols-1", "@md:grid-cols-2"]));
    expect(row.parentElement!.className).toContain("@container");
    expect(row.children).toHaveLength(2);
    // Say now comes first, so it is on top when stacked.
    expect(row.children[0].contains(sayNow)).toBe(true);
    expect(row.children[1].contains(hold)).toBe(true);

    // Same size and styling for both.
    expect(sayNow.className).toBe(hold.className);
    expect(sayNow.className).toContain("min-h-[5.5rem]");
    expect(sayNow.className).toContain("resize-y");

    // Action field kept, at ~4 lines.
    const action = screen.getByLabelText("Action") as HTMLTextAreaElement;
    expect(action.className).toContain("min-h-[7.75rem]");

    // Old combined placeholder is gone.
    expect(screen.queryByPlaceholderText("Say now… / Hold…")).toBeNull();
  });

  it("sends each field separately", () => {
    const onChange = vi.fn();
    render(<ResponsePanel item={items[0]} value={empty} disabled={false} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Say now"), { target: { value: "Tell Ravi today" } });
    fireEvent.change(screen.getByLabelText("Hold"), { target: { value: "No dates yet" } });
    expect(onChange).toHaveBeenCalledWith("say_now_text", "Tell Ravi today");
    expect(onChange).toHaveBeenCalledWith("hold_text", "No dates yet");
  });

  it("shows saved values and disables both when locked", () => {
    render(
      <ResponsePanel item={items[0]} value={{ ...empty, say_now_text: "A", hold_text: "B" }} disabled onChange={() => {}} />,
    );
    const sayNow = screen.getByLabelText("Say now") as HTMLTextAreaElement;
    const hold = screen.getByLabelText("Hold") as HTMLTextAreaElement;
    expect([sayNow.value, hold.value]).toEqual(["A", "B"]);
    expect(sayNow.matches(":disabled") && hold.matches(":disabled")).toBe(true);
  });
});

describe("ResponsePanel – Item 9", () => {
  it("is unchanged", () => {
    const item9 = items.find((it) => it.id === 9)!;
    const { container } = render(
      <ResponsePanel item={item9} value={{ ...empty, recommendation_text: "x" }} disabled={false} onChange={() => {}} />,
    );
    expect(screen.queryByLabelText("Say now")).toBeNull();
    expect(screen.queryByLabelText("Hold")).toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("itemState", () => {
  const item = items[0];
  it("needs priority, action, say now and hold for complete; none are mandatory", () => {
    expect(itemState(item, empty)).toBe("empty");
    expect(itemState(item, { ...empty, say_now_text: "x" })).toBe("partial");
    expect(itemState(item, { ...empty, priority: "High", action_text: "x", say_now_text: "x" })).toBe("partial");
    expect(itemState(item, { ...empty, priority: "High", action_text: "x", say_now_text: "x", hold_text: "y" })).toBe(
      "complete",
    );
  });
  it("counts a legacy combined answer for both halves", () => {
    expect(itemState(item, { ...empty, priority: "High", action_text: "x", say_hold_text: "old" })).toBe("complete");
  });
});
