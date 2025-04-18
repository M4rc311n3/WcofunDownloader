import { FC, useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const notificationVariants = cva(
  "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-l-4 border-primary",
        error: "border-l-4 border-red-500",
        warning: "border-l-4 border-yellow-500",
        success: "border-l-4 border-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface NotificationProps extends VariantProps<typeof notificationVariants> {
  title: string;
  message: string;
  onClose?: () => void;
  duration?: number; // in milliseconds
}

export const Notification: FC<NotificationProps> = ({
  title,
  message,
  variant,
  onClose,
  duration = 5000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          onClose && onClose();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose && onClose();
    }, 300);
  };

  return (
    <div
      className={cn(
        "transform transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <div className={notificationVariants({ variant })}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle
                className={cn("h-6 w-6", {
                  "text-primary": variant === "default",
                  "text-red-400": variant === "error",
                  "text-yellow-400": variant === "warning",
                  "text-green-400": variant === "success",
                })}
              />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                onClick={handleClose}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
