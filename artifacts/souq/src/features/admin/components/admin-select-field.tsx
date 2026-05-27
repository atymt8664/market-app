import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_SELECT_CONTENT,
  ADMIN_SELECT_ITEM,
  ADMIN_SELECT_TRIGGER,
} from "@/features/admin/admin-interaction-classes";
import { cn } from "@/lib/utils";

export type AdminSelectOption = {
  value: string;
  label: string;
};

type AdminSelectFieldProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

export function AdminSelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  triggerClassName,
}: AdminSelectFieldProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn(ADMIN_SELECT_TRIGGER, triggerClassName)} dir="rtl">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        dir="rtl"
        className={ADMIN_SELECT_CONTENT}
        position="popper"
        sideOffset={6}
      >
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className={ADMIN_SELECT_ITEM}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
