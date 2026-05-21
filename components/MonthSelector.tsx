import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";

interface MonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

export function MonthSelector({ currentDate, onChange }: MonthSelectorProps) {
  // Generate [prev2, prev1, current, next1] for example? Or just display months horizontally
  // Let's generate [prev2, prev1, current, next1]
  const months = [
    subMonths(currentDate, 2),
    subMonths(currentDate, 1),
    currentDate,
    addMonths(currentDate, 1),
  ];

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => onChange(subMonths(currentDate, 1))}
        className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white transition-all">
        <ChevronLeft size={16} />
      </button>
      <div className="flex items-center gap-1">
        {months.map((m, i) => {
          const isActive = i === 2; // current is always at index 2
          return (
            <button key={m.getTime()} 
              onClick={() => onChange(m)}
              className={`px-3 py-1 rounded-lg text-sm transition-all font-medium ${
                isActive
                  ? "text-white border-b-2"
                  : "text-[var(--color-text-muted)] hover:text-white"
              }`}
              style={isActive ? {
                borderColor: "var(--color-accent)",
                color: "white",
                fontSize: "1rem",
              } : {}}>
              {format(m, "MMM yyyy", { locale: id })}
            </button>
          );
        })}
      </div>
      <button 
        onClick={() => onChange(addMonths(currentDate, 1))}
        className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white transition-all">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
