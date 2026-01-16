export type ClassValue = string | null | undefined | false;

export const cn = (...classes: ClassValue[]) =>
  classes.filter(Boolean).join(" ");
