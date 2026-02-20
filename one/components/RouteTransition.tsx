"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

export default function RouteTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
