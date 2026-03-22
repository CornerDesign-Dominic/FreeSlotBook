const listeners = new Set<() => void>();

export function emitSlotCalendarMonthReset() {
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribeToSlotCalendarMonthReset(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
