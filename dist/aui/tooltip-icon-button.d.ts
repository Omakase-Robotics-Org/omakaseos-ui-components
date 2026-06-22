import { ComponentPropsWithRef } from 'react';
import { Button } from './ui/button';
export type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
    tooltip: string;
    side?: "top" | "bottom" | "left" | "right";
};
export declare const TooltipIconButton: import('react').ForwardRefExoticComponent<Omit<TooltipIconButtonProps, "ref"> & import('react').RefAttributes<HTMLButtonElement>>;
