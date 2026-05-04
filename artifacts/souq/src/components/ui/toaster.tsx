import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isPremiumCard =
          variant === "authAlert" || variant === "default" || variant == null
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className={cn("grid", isPremiumCard ? "gap-1.5" : "gap-1")}>
              {title && (
                <ToastTitle
                  className={cn(
                    isPremiumCard && "text-sm font-semibold leading-snug text-foreground",
                  )}
                >
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription
                  className={cn(
                    isPremiumCard &&
                      "text-xs leading-relaxed text-muted-foreground opacity-100",
                  )}
                >
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
