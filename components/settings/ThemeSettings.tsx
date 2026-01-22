"use client";

import { Sun, Moon, Monitor, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/lib/theme";

interface ThemeOption {
  mode: ThemeMode;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const themeOptions: ThemeOption[] = [
  {
    mode: "light",
    title: "Light",
    description: "Always use light theme",
    icon: <Sun className="w-5 h-5" />,
  },
  {
    mode: "dark",
    title: "Dark",
    description: "Always use dark theme",
    icon: <Moon className="w-5 h-5" />,
  },
  {
    mode: "system",
    title: "System",
    description: "Follow your device settings",
    icon: <Monitor className="w-5 h-5" />,
  },
];

export function ThemeSettings() {
  const { mode, setMode } = useTheme();

  return (
    <div className="space-y-3">
      {themeOptions.map((option) => {
        const isSelected = mode === option.mode;

        return (
          <button
            type="button"
            key={option.mode}
            onClick={() => setMode(option.mode)}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all
              ${isSelected
                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }
              cursor-pointer
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  p-2.5 rounded-xl
                  ${isSelected
                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }
                `}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-semibold ${
                      isSelected
                        ? "text-rose-900 dark:text-rose-100"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {option.title}
                  </h3>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                <p
                  className={`text-sm mt-0.5 ${
                    isSelected
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
