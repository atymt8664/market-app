import { t } from "@/i18n";
import { SETTINGS_CARD } from "@/components/settings-shell";

export type LegalSectionDef = {
  titleKey: string;
  bodyKey: string;
  listKeys?: string[];
};

export function LegalSectionCard({ titleKey, bodyKey, listKeys }: LegalSectionDef) {
  return (
    <div className={SETTINGS_CARD}>
      <h3 className="text-sm font-semibold text-foreground">{t(titleKey)}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{t(bodyKey)}</p>
      {listKeys && listKeys.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm leading-7 text-muted-foreground">
          {listKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LegalContactCard({ titleKey, bodyKey, email }: { titleKey: string; bodyKey: string; email: string }) {
  return (
    <div className={SETTINGS_CARD}>
      <h3 className="text-sm font-semibold text-foreground">{t(titleKey)}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t(bodyKey)}</p>
      <a
        href={`mailto:${email}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/10 hover:underline"
        dir="ltr"
      >
        {email}
      </a>
    </div>
  );
}
