import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPicker } from "@/components/site/ColorPicker";
import { HERO_TEXT_FONTS, HERO_TEXT_SIZES, HERO_TEXT_WEIGHTS, isHeroTextCustomised } from "@/lib/heroText";
import type { HeroTextStyle } from "@/types/sitePage";

// Radix <Select> rejects an empty item value, so "keep the default" travels as a sentinel.
const DEFAULT = "__default";

function StyleSelect({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Select disabled={disabled} value={value || DEFAULT} onValueChange={(v) => onChange(v === DEFAULT ? "" : v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || DEFAULT} value={o.value || DEFAULT}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Formatting for one line of hero text: show/hide it, and pick its font, size,
 * weight and colour. Sits under the input that edits the text itself. Used by
 * every hero editor (page builders, home hero, built-in page heroes) so they
 * all offer the same choices.
 */
export function HeroTextFormat({
  label, value, onChange, disabled,
}: {
  /** Which line this formats, e.g. "Title" — used for the switch's label. */
  label: string;
  value?: HeroTextStyle;
  onChange: (value: HeroTextStyle) => void;
  disabled?: boolean;
}) {
  const style = value || {};
  const set = (patch: Partial<HeroTextStyle>) => onChange({ ...style, ...patch });
  const shown = !style.hidden;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
          <Switch
            checked={shown}
            disabled={disabled}
            onCheckedChange={(on) => set({ hidden: !on })}
            aria-label={`Show ${label.toLowerCase()} on the page`}
          />
          {shown ? `Show ${label.toLowerCase()}` : `${label} is hidden on the page`}
        </label>
        {shown && isHeroTextCustomised(style) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={disabled}
            onClick={() => onChange({})}
          >
            Reset formatting
          </Button>
        )}
      </div>

      {shown && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StyleSelect label="Font" value={style.font} options={HERO_TEXT_FONTS} disabled={disabled} onChange={(font) => set({ font })} />
          <StyleSelect label="Size" value={style.size} options={HERO_TEXT_SIZES} disabled={disabled} onChange={(size) => set({ size })} />
          <StyleSelect label="Weight" value={style.weight} options={HERO_TEXT_WEIGHTS} disabled={disabled} onChange={(weight) => set({ weight })} />
          <div className="min-w-0 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Colour</Label>
            <ColorPicker
              value={style.color}
              disabled={disabled}
              defaultLabel="Default"
              onChange={(color) => set({ color })}
              className="h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
}
