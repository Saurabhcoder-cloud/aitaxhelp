export interface NavItem {
  title: string;
  href: string;
  description?: string;
  badge?: string;
  children?: NavItem[];
}

export interface FooterSection {
  title: string;
  links: Array<{
    title: string;
    href: string;
    isExternal?: boolean;
  }>;
}
