// import React from "react";
// import { cn } from "../utility/cn";

// const Skeleton = ({ className, ...props }) => {
//   return (
//     <div
//       className={cn(
//         "relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700",
//         className
//       )}
//       {...props}
//     >
//       {/* shimmer effect */}
//       <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
//     </div>
//   );
// };

// export { Skeleton };


import React from "react";
import { cn } from "../utility/cn";

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-200/80 dark:bg-gray-800/60",
        "before:absolute before:inset-0",
        "before:-translate-x-full before:animate-[shimmer_1.2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
        className
      )}
      {...props}
    />
  );
};

export { Skeleton };