import React from "react";
export const Provider = ({ children }: any) => React.createElement(React.Fragment, null, children);
export const Root = ({ children, ...props }: any) => React.createElement("div", props, children);
export const Title = ({ children, ...props }: any) => React.createElement("div", props, children);
export const Description = ({ children, ...props }: any) => React.createElement("div", props, children);
export const Close = ({ children, ...props }: any) => React.createElement("button", props, children);
export const Viewport = React.forwardRef<HTMLDivElement, any>((props, ref) =>
  React.createElement("div", { ...props, ref })
);
export type ToastActionElement = any;
export type ToastProps = any;
