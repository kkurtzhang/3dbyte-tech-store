import {
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui";

import type { BooleanFormValue } from "../lib/ai-product-metadata";

type SectionToggleProps = {
  checked: boolean;
  description: string;
  onCheckedChange: (checked: boolean) => void;
  title: string;
};

type TextFieldProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
};

type TextAreaFieldProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type BooleanFieldProps = {
  label: string;
  onChange: (value: BooleanFormValue) => void;
  value: BooleanFormValue;
};

export const SectionToggle = ({
  checked,
  description,
  onCheckedChange,
  title,
}: SectionToggleProps) => (
  <div className="flex items-start justify-between gap-x-4 border-b border-ui-border-base pb-4">
    <div>
      <Heading level="h3">{title}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {description}
      </Text>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export const TextField = ({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: TextFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

export const TextAreaField = ({
  label,
  onChange,
  placeholder,
  value,
}: TextAreaFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Textarea
      value={value}
      placeholder={placeholder}
      rows={3}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

export const BooleanField = ({ label, onChange, value }: BooleanFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Select
      value={value || "unset"}
      onValueChange={(nextValue) =>
        onChange(nextValue === "unset" ? "" : (nextValue as BooleanFormValue))
      }
    >
      <Select.Trigger>
        <Select.Value placeholder="Unset" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="unset">Unset</Select.Item>
        <Select.Item value="true">Yes</Select.Item>
        <Select.Item value="false">No</Select.Item>
      </Select.Content>
    </Select>
  </div>
);
