import { cn } from './ui/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg font-bold',
    md: 'text-xl font-bold',
    lg: 'text-2xl font-bold',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
        <span className="text-primary-foreground font-bold text-sm">A</span>
      </div>
      <span className={cn(sizeClasses[size], 'text-foreground tracking-tight')}>
        AxionAI
      </span>
    </div>
  );
} 