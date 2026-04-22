import {
  Home,
  Shirt,
  Car,
  Sofa,
  Smartphone,
  Briefcase,
  Baby,
  PawPrint,
  Tent,
  BookOpen,
  Ticket,
  Wrench,
  Gift,
  GraduationCap,
  HeartHandshake,
  Tag,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  home: Home,
  shirt: Shirt,
  car: Car,
  sofa: Sofa,
  smartphone: Smartphone,
  briefcase: Briefcase,
  baby: Baby,
  "paw-print": PawPrint,
  tent: Tent,
  "book-open": BookOpen,
  ticket: Ticket,
  wrench: Wrench,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-handshake": HeartHandshake,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = map[name] ?? Tag;
  return <Icon className={className} />;
}
