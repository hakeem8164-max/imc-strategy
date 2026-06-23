import type { Profile } from "@/lib/types";

export default function Header({
  title,
  subtitle,
}: {
  profile?: Profile;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-extrabold text-mushar-dark">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}
