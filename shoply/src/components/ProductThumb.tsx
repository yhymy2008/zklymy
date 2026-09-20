import {
  BookOpen,
  Camera,
  Coffee,
  Cpu,
  Dumbbell,
  Gamepad2,
  Headphones,
  Home,
  Laptop,
  Package,
  Shirt,
  Smartphone,
  Watch,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  watch: Watch,
  camera: Camera,
  shirt: Shirt,
  home: Home,
  coffee: Coffee,
  gift: Package,
  gamepad: Gamepad2,
  book: BookOpen,
  dumbbell: Dumbbell,
  cpu: Cpu,
  package: Package,
};

export function getIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || Package;
}

interface Props {
  hue: number;
  icon?: string;
  className?: string;
  iconClassName?: string;
}

/** 用渐变色块 + 线性图标代替商品图片，避免引入二进制素材 */
export default function ProductThumb({
  hue,
  icon,
  className = '',
  iconClassName = 'h-12 w-12',
}: Props) {
  const Icon = getIcon(icon);
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 85% 94%), hsl(${(hue + 40) % 360} 80% 88%))`,
      }}
      aria-hidden="true"
    >
      <Icon
        className={`${iconClassName} transition-transform duration-300`}
        style={{ color: `hsl(${hue} 65% 45%)`, strokeWidth: 1.6 }}
      />
    </div>
  );
}
