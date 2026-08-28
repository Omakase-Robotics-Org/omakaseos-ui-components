import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyNote } from "./EmptyNote";

describe("EmptyNote", () => {
  it("renders its label in a paragraph", () => {
    render(<EmptyNote label="No robots found." />);
    const note = screen.getByText("No robots found.");
    expect(note).toBeInTheDocument();
    expect(note.tagName).toBe("P");
  });
});
