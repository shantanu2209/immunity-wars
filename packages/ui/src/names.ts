/**
 * Display names, one source: the rules tables in content (the rule set at the P2.4
 * label-case fix — never two sources that can disagree on case or wording).
 */
import { CNAME, UI_ } from '@immunity-wars/content';

export const cellDisplayName = (ck: string): string =>
  String((CNAME as Record<string, string>)[ck] ?? ck);

export const typeDisplayName = (ty: string): string =>
  String((UI_ as Record<string, { n?: string }>)[ty]?.n ?? ty);
