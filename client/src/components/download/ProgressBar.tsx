import { FC } from "react";

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({ progress, className = "" }) => {
  return (
    <div className={`w-full h-2 mt-1 bg-gray-200 rounded-full ${className}`}>
      <div
        className="h-2 bg-emerald-500 rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      ></div>
    </div>
  );
};
