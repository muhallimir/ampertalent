import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export function Logo(props: { className?: string, link?: string, showText?: boolean, size?: 'sm' | 'md' | 'lg' }) {
  const { showText = true, size = 'md' } = props;
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <Link href={props.link ?? '/'} className={cn("flex items-center space-x-2", props.className)}>
      {/* Ampertalent Logo */}
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden`}>
        <Image
          src="/logo/ampertalent.png"
          alt="Ampertalent Logo"
          width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
          height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
          className="object-contain"
        />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span className="font-bold text-gray-900 sm:inline-block">Ampertalent</span>
      )}
    </Link>
  );
}
