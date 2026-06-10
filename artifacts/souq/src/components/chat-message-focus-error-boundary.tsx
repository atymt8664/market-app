import { Component, type ReactNode } from "react";

type ChatMessageFocusErrorBoundaryProps = {
  onError: () => void;
  children: ReactNode;
};

type ChatMessageFocusErrorBoundaryState = {
  hasError: boolean;
};

/** Closes message focus if reactions/actions overlay throws during render. */
export class ChatMessageFocusErrorBoundary extends Component<
  ChatMessageFocusErrorBoundaryProps,
  ChatMessageFocusErrorBoundaryState
> {
  state: ChatMessageFocusErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChatMessageFocusErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
