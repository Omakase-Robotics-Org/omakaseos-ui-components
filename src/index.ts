/**
 * @file Public surface of the shared status-monitor component library (PoC).
 *
 * Only L1 visual primitives are exported. L2 (BatteryBadge, ConnectionBadge,
 * SignalBars) and L3 (RobotStatePanel, ServicePanel) are deferred until the
 * neutral L1 API is proven against both consuming apps.
 */
export { StatusBadge } from "./StatusBadge";
export type { BadgeTone, BadgeSize, StatusBadgeProps } from "./StatusBadge";

export { Card, CardHeader } from "./Card";
export type { CardProps, CardHeaderProps } from "./Card";

export { Fact, FactList } from "./Fact";
export type { FactDirection, FactProps } from "./Fact";

export { ButtonRow } from "./ButtonRow";

import "./tokens.css";
