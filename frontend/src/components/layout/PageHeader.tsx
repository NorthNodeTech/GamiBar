import { motion } from "framer-motion";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}
