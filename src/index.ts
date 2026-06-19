/**
 * @file Public surface of @omakase-robotics/ui-components.
 *
 * v0.1–v0.2: status-monitor primitives (StatusBadge, Card, Fact, ButtonRow).
 * v0.3:      basic form & layout primitives (Input, Select, Textarea,
 *            Heading, Toolbar, Button, Checkbox, Switch, Slider).
 *
 * L2 (BatteryBadge, ConnectionBadge, SignalBars) and L3 (RobotStatePanel,
 * ServicePanel) remain deferred until the contract is proven across both
 * consuming apps.
 */

// Status-monitor primitives
export { StatusBadge } from "./StatusBadge";
export type { BadgeTone, BadgeSize, StatusBadgeProps } from "./StatusBadge";

export { Card, CardHeader } from "./Card";
export type { CardProps, CardHeaderProps } from "./Card";

export { Fact, FactList } from "./Fact";
export type { FactDirection, FactProps } from "./Fact";

export { ButtonRow } from "./ButtonRow";

// Form & layout primitives (v0.3)
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";

export { Select } from "./Select";
export type { SelectProps, SelectSize } from "./Select";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Heading } from "./Heading";
export type { HeadingProps, HeadingLevel } from "./Heading";

export { Toolbar } from "./Toolbar";
export type { ToolbarProps, ToolbarAlign } from "./Toolbar";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

export { Slider } from "./Slider";
export type { SliderProps } from "./Slider";

import "./tokens.css";
