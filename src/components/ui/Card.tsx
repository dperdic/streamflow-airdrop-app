export function Card({
  title,
  value,
  footer,
}: {
  title: string;
  value: string;
  footer?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-white px-8 py-4 shadow">
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-lg font-medium">{value}</p>
      </div>
      {footer && (
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">{footer}</p>
        </div>
      )}
    </div>
  );
}
