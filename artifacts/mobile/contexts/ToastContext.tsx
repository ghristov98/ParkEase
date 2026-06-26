import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastPosition = "top" | "bottom";

interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  position: ToastPosition;
  anim: Animated.Value;
  progress: Animated.Value;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextType {
  showToast: (
    message: string,
    options?: { title?: string; type?: ToastType; position?: ToastPosition }
  ) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

const TOAST_META: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: "#F0FDF4", icon: "✅", border: "#86EFAC" },
  error:   { bg: "#FFF1F1", icon: "❌", border: "#FCA5A5" },
  info:    { bg: "#EFF6FF", icon: "ℹ️", border: "#93C5FD" },
  warning: { bg: "#FFFBEB", icon: "⚠️", border: "#FCD34D" },
};

const ToastItemView = React.memo(function ToastItemView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const c = TOAST_META[item.type];
  const isBottom = item.position === "bottom";

  const translateY = useMemo(
    () =>
      item.anim.interpolate({
        inputRange: [0, 1],
        outputRange: [isBottom ? 60 : -60, 0],
      }),
    [item.anim, isBottom]
  );

  const progressWidth = useMemo(() => {
    if (!barWidth) return undefined;
    return item.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, barWidth],
    });
  }, [item.progress, barWidth]);

  return (
    <Animated.View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && !barWidth) setBarWidth(w);
      }}
      style={[
        styles.toast,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          opacity: item.anim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toastContent}>
        <Text style={styles.toastIcon}>{c.icon}</Text>
        <View style={styles.toastTextCol}>
          {item.title ? (
            <Text style={styles.toastTitle} numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}
          <Text style={styles.toastMessage} numberOfLines={3}>
            {item.message}
          </Text>
        </View>
        <Pressable
          onPress={() => onDismiss(item.id)}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 4 })}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        {progressWidth !== undefined && (
          <Animated.View
            style={[styles.progressBar, { width: progressWidth, backgroundColor: c.border }]}
          />
        )}
      </View>
    </Animated.View>
  );
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);
  const insets = useSafeAreaInsets();
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const toastsRef = useRef<ToastItem[]>([]);

  const updateToasts = useCallback(
    (fn: (prev: ToastItem[]) => ToastItem[]) => {
      setToasts((prev) => {
        const next = fn(prev);
        toastsRef.current = next;
        return next;
      });
    },
    []
  );

  const dismissToast = useCallback(
    (id: string) => {
      const item = toastsRef.current.find((t) => t.id === id);
      if (!item) return;
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
      Animated.timing(item.anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setToasts((p) => {
          const next = p.filter((t) => t.id !== id);
          toastsRef.current = next;
          return next;
        });
      });
    },
    []
  );

  const showToast = useCallback(
    (
      message: string,
      options?: { title?: string; type?: ToastType; position?: ToastPosition }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const type: ToastType = options?.type ?? "info";
      const position: ToastPosition =
        options?.position ?? (Platform.OS === "web" ? "top" : "bottom");
      const anim = new Animated.Value(0);
      const progress = new Animated.Value(1);

      const item: ToastItem = {
        id,
        message,
        title: options?.title,
        type,
        position,
        anim,
        progress,
      };

      updateToasts((prev) => {
        const samePos = prev.filter((t) => t.position === position);
        if (samePos.length >= MAX_TOASTS) {
          const oldest = samePos[0];
          if (timersRef.current[oldest.id]) {
            clearTimeout(timersRef.current[oldest.id]);
            delete timersRef.current[oldest.id];
          }
          return [...prev.filter((t) => t.id !== oldest.id), item];
        }
        return [...prev, item];
      });

      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 85,
        friction: 10,
      }).start();

      Animated.timing(progress, {
        toValue: 0,
        duration: AUTO_DISMISS_MS,
        useNativeDriver: false,
      }).start();

      timersRef.current[id] = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [updateToasts, dismissToast]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) =>
      showToast(message, { type: "success", title }),
    [showToast]
  );
  const showError = useCallback(
    (message: string, title?: string) =>
      showToast(message, { type: "error", title }),
    [showToast]
  );
  const showInfo = useCallback(
    (message: string, title?: string) =>
      showToast(message, { type: "info", title }),
    [showToast]
  );
  const showWarning = useCallback(
    (message: string, title?: string) =>
      showToast(message, { type: "warning", title }),
    [showToast]
  );
  const showConfirm = useCallback(
    (opts: ConfirmOptions) => setConfirmOpts(opts),
    []
  );

  const topToasts = useMemo(
    () => toasts.filter((t) => t.position === "top"),
    [toasts]
  );
  const bottomToasts = useMemo(
    () => toasts.filter((t) => t.position === "bottom"),
    [toasts]
  );

  const value = useMemo<ToastContextType>(
    () => ({
      showToast,
      showSuccess,
      showError,
      showInfo,
      showWarning,
      showConfirm,
    }),
    [showToast, showSuccess, showError, showInfo, showWarning, showConfirm]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <View
        style={[styles.stackTop, { top: insets.top + 10, pointerEvents: "box-none" }]}
      >
        {topToasts.map((item) => (
          <ToastItemView key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </View>

      <View
        style={[styles.stackBottom, { bottom: insets.bottom + 90, pointerEvents: "box-none" }]}
      >
        {bottomToasts.map((item) => (
          <ToastItemView key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </View>

      <Modal
        transparent
        visible={!!confirmOpts}
        animationType="fade"
        onRequestClose={() => {
          confirmOpts?.onCancel?.();
          setConfirmOpts(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            confirmOpts?.onCancel?.();
            setConfirmOpts(null);
          }}
        >
          <Pressable style={styles.modalBox} onPress={() => {}}>
            {confirmOpts?.title ? (
              <Text style={styles.modalTitle}>{confirmOpts.title}</Text>
            ) : null}
            {confirmOpts?.message ? (
              <Text style={styles.modalMessage}>{confirmOpts.message}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  confirmOpts?.onCancel?.();
                  setConfirmOpts(null);
                }}
              >
                <Text style={styles.modalCancelText}>
                  {confirmOpts?.cancelText ?? "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  confirmOpts?.destructive
                    ? styles.modalDestructiveBtn
                    : styles.modalConfirmBtn,
                ]}
                onPress={() => {
                  confirmOpts?.onConfirm();
                  setConfirmOpts(null);
                }}
              >
                <Text style={styles.modalConfirmText}>
                  {confirmOpts?.confirmText ?? "OK"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  stackTop: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  stackBottom: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  toastIcon: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 1,
  },
  toastTextCol: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  toastMessage: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  dismissText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 1,
  },
  progressTrack: {
    height: 3,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  progressBar: {
    height: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    width: 300,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: { backgroundColor: "#F3F4F6" },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  modalConfirmBtn: { backgroundColor: "#0E4BF1" },
  modalDestructiveBtn: { backgroundColor: "#EF4444" },
  modalConfirmText: { fontSize: 15, fontWeight: "600", color: "white" },
});
