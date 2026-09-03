import { useState, type DragEvent } from "react";

interface DropTarget {
  index: number;
  /** Drop above (true) or below (false) the row under the pointer. */
  before: boolean;
}

/**
 * Native HTML5 drag-and-drop reordering for a vertical list.
 * Rows only become draggable while their handle is pressed, so buttons and
 * inputs inside a row behave normally. Desktop pointer only — keep move
 * buttons as the keyboard / touch fallback.
 */
export function useDragReorder(onReorder: (from: number, to: number) => void, enabled = true) {
  const [armed, setArmed] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);

  const reset = () => {
    setArmed(null);
    setDragIndex(null);
    setTarget(null);
  };

  /** Spread onto the drag handle element of row `index`. */
  const handleProps = (index: number) => ({
    onMouseDown: () => { if (enabled) setArmed(index); },
    onMouseUp: () => setArmed(null),
  });

  /** Spread onto the row element itself. */
  const rowProps = (index: number) => ({
    draggable: enabled && armed === index,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      if (!enabled || armed !== index) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      setDragIndex(index);
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      setTarget((t) => (t && t.index === index && t.before === before ? t : { index, before }));
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (dragIndex !== null && target) {
        let to = target.before ? target.index : target.index + 1;
        if (dragIndex < to) to -= 1;
        if (to !== dragIndex) onReorder(dragIndex, to);
      }
      reset();
    },
    onDragEnd: reset,
  });

  /** Where the drop line should show on row `index`, if anywhere. */
  const indicator = (index: number): "top" | "bottom" | null => {
    if (dragIndex === null || !target || target.index !== index) return null;
    const to = target.before ? index : index + 1;
    // No line for a drop that would leave the item where it already is.
    if (to === dragIndex || to === dragIndex + 1) return null;
    return target.before ? "top" : "bottom";
  };

  return { dragIndex, handleProps, rowProps, indicator };
}
