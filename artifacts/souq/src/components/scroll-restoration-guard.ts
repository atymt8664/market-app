/**
 * BottomNav يطلق PopStateEvent برمجيًا بعد pushState — لا يُعد رجوعًا حقيقيًا.
 * العلم أدق من `isTrusted` على بعض متصفحات الجوال.
 */
export const scrollPopstateGuard = {
  skipNext: false,
};
