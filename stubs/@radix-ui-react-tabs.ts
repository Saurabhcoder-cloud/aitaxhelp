import React from "react";
export const Root = ({ children, ...props }: any) => React.createElement("div", props, children);
export const List = ({ children, ...props }: any) => React.createElement("div", props, children);
export const Trigger = ({ children, ...props }: any) => React.createElement("button", props, children);
export const Content = ({ children, ...props }: any) => React.createElement("div", props, children);
export default { Root, List, Trigger, Content };
