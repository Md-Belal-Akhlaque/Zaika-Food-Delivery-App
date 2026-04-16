import React from "react";
import { cn } from "../utility/cn";

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  );
};

export { Skeleton };
