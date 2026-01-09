import React from "react";
export const Root = ({ children, ...props }: any) =>
  React.createElement("div", props, children);
export const Indicator = ({ children }: any) => React.createElement(React.Fragment, null, children);
export default { Root, Indicator };
