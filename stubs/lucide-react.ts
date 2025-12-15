import React from "react";
export const X = (props: any) => React.createElement("span", props, "x");
export const Check = (props: any) => React.createElement("span", props, "✓");
export const ChevronDown = (props: any) => React.createElement("span", props, "⌄");
export default function Icon(props: any) {
  return React.createElement("span", props, "icon");
}
