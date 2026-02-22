interface ComingSoonPlaceholderProps {
  projectType: string;
}

export function ComingSoonPlaceholder({ projectType }: ComingSoonPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
      <p className="text-sm font-medium text-foreground">{projectType} Deal Analyzer</p>
      <p className="mt-1 text-xs text-muted">
        This analyzer is under development. The Scattered Lot analyzer is available now.
      </p>
    </div>
  );
}
