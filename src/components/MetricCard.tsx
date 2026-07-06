import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "green" | "blue" | "gold" | "coral";
};

const toneClasses = {
  green: "from-palm/25 to-palm/5 text-palm",
  blue: "from-lagoon/25 to-lagoon/5 text-lagoon",
  gold: "from-dune/25 to-dune/5 text-dune",
  coral: "from-coral/25 to-coral/5 text-coral"
};

export function MetricCard({ label, value, detail, icon: Icon, tone = "green" }: MetricCardProps) {
  return (
    <motion.article
      className="panel group overflow-hidden p-5"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.55 }}
    >
      <div className={`mb-8 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-[0.22em] opacity-50">{label}</p>
      <div className="mt-2 text-4xl font-semibold">{value}</div>
      <p className="mt-3 text-sm leading-6 opacity-70">{detail}</p>
    </motion.article>
  );
}
