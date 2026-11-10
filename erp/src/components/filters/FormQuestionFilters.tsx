import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, ListFilter, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApplicationQuestionField, FormRule, FormRules, QuestionKind } from "@/lib/api";

// Operators per question kind, mirrored from api/src/utils/formDataFilter.js
const ANSWERED_OPS = [
  { value: "not_empty", label: "is answered" },
  { value: "empty", label: "is not answered" },
];

const OPERATORS: Record<QuestionKind, { value: string; label: string }[]> = {
  choice: [{ value: "in", label: "is any of" }, { value: "nin", label: "is none of" }, ...ANSWERED_OPS],
  multi: [{ value: "in", label: "includes any of" }, { value: "nin", label: "includes none of" }, ...ANSWERED_OPS],
  boolean: [{ value: "checked", label: "is ticked" }, { value: "unchecked", label: "is not ticked" }],
  number: [
    { value: "eq", label: "equals" },
    { value: "gt", label: "greater than" },
    { value: "gte", label: "at least" },
    { value: "lt", label: "less than" },
    { value: "lte", label: "at most" },
    { value: "between", label: "is between" },
    ...ANSWERED_OPS,
  ],
  date: [
    { value: "on", label: "is on" },
    { value: "before", label: "is before" },
    { value: "after", label: "is after" },
    { value: "between", label: "is between" },
    ...ANSWERED_OPS,
  ],
  text: [{ value: "contains", label: "contains" }, { value: "equals", label: "is exactly" }, ...ANSWERED_OPS],
};

const NO_VALUE_OPS = ["empty", "not_empty", "checked", "unchecked"];

type DraftRule = FormRule & { uid: number };

let nextUid = 1;
const toDraft = (rules: FormRule[]): DraftRule[] => rules.map((rule) => ({ ...rule, uid: nextUid++ }));

function isComplete(rule: DraftRule, question?: ApplicationQuestionField) {
  if (!question) return false;
  if (NO_VALUE_OPS.includes(rule.op)) return true;
  if (question.kind === "choice" || question.kind === "multi") return (rule.values?.length ?? 0) > 0;
  if (!rule.value?.trim()) return false;
  return rule.op !== "between" || !!rule.value2?.trim();
}

// Only the fields the operator uses, so stale values never reach the API
function toRule({ key, op, values, value, value2 }: DraftRule, question: ApplicationQuestionField): FormRule {
  if (NO_VALUE_OPS.includes(op)) return { key, op };
  if (question.kind === "choice" || question.kind === "multi") return { key, op, values };
  return op === "between" ? { key, op, value: value?.trim(), value2: value2?.trim() } : { key, op, value: value?.trim() };
}

interface FormQuestionFiltersProps {
  /** Answerable questions of the selected scheme's form */
  questions: ApplicationQuestionField[];
  /** Conditions currently applied to the listing */
  value: FormRules;
  onApply: (rules: FormRules) => void;
  className?: string;
}

/**
 * Advanced filters on a scheme's form answers: each condition picks a
 * question, an operator suited to its type and a value. Edits stay a draft
 * until applied, so typing does not refetch the list on every keystroke.
 */
export function FormQuestionFilters({ questions, value, onApply, className }: FormQuestionFiltersProps) {
  const [match, setMatch] = useState<FormRules["match"]>(value.match);
  const [draft, setDraft] = useState<DraftRule[]>(() => toDraft(value.rules));

  // Follow external resets (scheme change, "Clear Filters")
  useEffect(() => {
    setMatch(value.match);
    setDraft(toDraft(value.rules));
  }, [value]);

  const questionByKey = useMemo(() => new Map(questions.map((question) => [question.key, question])), [questions]);
  const pages = useMemo(() => [...new Set(questions.map((question) => question.page))], [questions]);

  const incomplete = draft.some((rule) => !isComplete(rule, questionByKey.get(rule.key)));
  const pending = draft
    .filter((rule) => isComplete(rule, questionByKey.get(rule.key)))
    .map((rule) => toRule(rule, questionByKey.get(rule.key)!));
  const dirty = JSON.stringify({ match: pending.length > 1 ? match : value.match, rules: pending }) !== JSON.stringify(value);

  const updateRule = (uid: number, patch: Partial<FormRule>) =>
    setDraft((rules) => rules.map((rule) => (rule.uid === uid ? { ...rule, ...patch } : rule)));

  const pickQuestion = (uid: number, key: string) => {
    const kind = questionByKey.get(key)!.kind;
    updateRule(uid, { key, op: OPERATORS[kind][0].value, values: [], value: "", value2: "" });
  };

  const toggleOption = (rule: DraftRule, option: string) => {
    const values = rule.values ?? [];
    updateRule(rule.uid, { values: values.includes(option) ? values.filter((v) => v !== option) : [...values, option] });
  };

  const apply = () => onApply({ match, rules: pending });
  const reset = () => onApply({ match: "all", rules: [] });

  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Form question filters</span>
          {value.rules.length > 0 && <Badge variant="secondary">{value.rules.length} applied</Badge>}
        </div>
        {draft.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Match
            <Select value={match} onValueChange={(v) => setMatch(v as FormRules["match"])}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="any">any</SelectItem>
              </SelectContent>
            </Select>
            of these conditions
          </div>
        )}
      </div>

      {draft.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Filter applicants by their answers to this scheme's form, e.g. a Yes/No question answered "Yes".
        </p>
      )}

      {draft.map((rule) => {
        const question = questionByKey.get(rule.key);
        const complete = isComplete(rule, question);
        return (
          <div
            key={rule.uid}
            className={cn(
              "grid grid-cols-1 gap-2 rounded-md border p-2 md:grid-cols-12 md:items-start",
              !complete && "border-amber-400/70 bg-amber-50/40 dark:bg-amber-500/5"
            )}
          >
            <div className="md:col-span-4">
              <QuestionPicker
                questions={questions}
                pages={pages}
                selected={question}
                onSelect={(key) => pickQuestion(rule.uid, key)}
              />
            </div>

            <div className="md:col-span-3">
              <Select
                value={question ? rule.op : undefined}
                onValueChange={(op) => updateRule(rule.uid, { op })}
                disabled={!question}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  {question && OPERATORS[question.kind].map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4">
              {question && !NO_VALUE_OPS.includes(rule.op) && (
                <RuleValueInput
                  question={question}
                  rule={rule}
                  onToggleOption={(option) => toggleOption(rule, option)}
                  onChange={(patch) => updateRule(rule.uid, patch)}
                />
              )}
            </div>

            <div className="flex md:col-span-1 md:justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDraft((rules) => rules.filter((r) => r.uid !== rule.uid))}
                aria-label="Remove condition"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDraft((rules) => [...rules, { uid: nextUid++, key: "", op: "" }])}
          disabled={questions.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add condition
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {incomplete && <span className="text-xs text-amber-600">Complete or remove the highlighted condition</span>}
          {(value.rules.length > 0 || draft.length > 0) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          )}
          <Button size="sm" onClick={apply} disabled={incomplete || !dirty}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionPicker({
  questions,
  pages,
  selected,
  onSelect,
}: {
  questions: ApplicationQuestionField[];
  pages: string[];
  selected?: ApplicationQuestionField;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-9 w-full justify-between font-normal">
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : "Select a question"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search questions..." />
          <CommandList>
            <CommandEmpty>No question found.</CommandEmpty>
            {pages.map((page) => (
              <CommandGroup key={page} heading={pages.length > 1 ? page : undefined}>
                {questions.filter((question) => question.page === page).map((question) => (
                  <CommandItem
                    key={question.key}
                    value={`${question.label} ${question.key}`}
                    onSelect={() => {
                      onSelect(question.key);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selected?.key === question.key ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{question.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RuleValueInput({
  question,
  rule,
  onToggleOption,
  onChange,
}: {
  question: ApplicationQuestionField;
  rule: DraftRule;
  onToggleOption: (option: string) => void;
  onChange: (patch: Partial<FormRule>) => void;
}) {
  if (question.kind === "choice" || question.kind === "multi") {
    if (question.options.length === 0) {
      return <p className="py-2 text-xs text-muted-foreground">This question has no options to pick from.</p>;
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {question.options.map((option) => {
          const active = rule.values?.includes(option);
          return (
            <Button
              key={option}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              aria-pressed={active}
              onClick={() => onToggleOption(option)}
            >
              {option}
            </Button>
          );
        })}
      </div>
    );
  }

  const inputType = question.kind === "number" ? "number" : question.kind === "date" ? "date" : "text";
  const placeholder = question.kind === "text" ? "Text" : question.kind === "number" ? "Value" : undefined;

  if (rule.op === "between") {
    return (
      <div className="flex items-center gap-2">
        <Input type={inputType} className="h-9" placeholder="From" value={rule.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} />
        <span className="text-xs text-muted-foreground">and</span>
        <Input type={inputType} className="h-9" placeholder="To" value={rule.value2 ?? ""} onChange={(e) => onChange({ value2: e.target.value })} />
      </div>
    );
  }

  return (
    <Input
      type={inputType}
      className="h-9"
      placeholder={placeholder}
      value={rule.value ?? ""}
      onChange={(e) => onChange({ value: e.target.value })}
    />
  );
}
