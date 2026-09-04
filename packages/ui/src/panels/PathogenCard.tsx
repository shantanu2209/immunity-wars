/**
 * THE PATHOGEN CARD — most of Kartik's science, as one scrolling card (ruled 4 September 2026,
 * COMMAND_SURFACE_PLAN §4: its own piece between CP3 and CP4; P2.6's disease library is this
 * component with an index).
 *
 * Every field is CONTENT data and none is engine: `DZINFO` (discovered / causes / found /
 * prevent / treat), `DZSTATS` (the four stat bars and the tier), `FACT` (present for ~30
 * diseases; nothing renders when absent), `TROPISM` (the organs it can infect, or any),
 * `FAMILY` → `FAMILIES` (the antigen class and its one-line biology), `UI_` (the type name),
 * and `BEAT_BY_TYPE` — legacy's UI constant, moved into content for this card and pinned
 * against legacy like every other extracted table. The disease prose is the diseases
 * namespace, Kartik's science, translated with the pack; the ~20 labels here are `ui.json`.
 *
 * A novel pathogen (Pathogen X) never gets a card: it is masked everywhere as unknown, and
 * the entry points do not offer one.
 *
 * "Right now" is the one line that is about THIS invader rather than the disease: the malaria
 * stage, or a parasite hiding inside a resident macrophage — the two invader states the
 * board-state sweep deferred to the card, because the card is what explains them.
 */
import {
  BEAT_BY_TYPE,
  DZINFO,
  DZSTATS,
  FACT,
  FAMILIES,
  FAMILY,
  ORGANS,
  TROPISM,
} from '@immunity-wars/content';
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { typeDisplayName } from '../names';

export interface PathogenCardSubject {
  disease: string;
  type: string;
  /** `view.memory[disease]` — the body has beaten this before. */
  remembered: boolean;
  /** The one line about this invader rather than the disease, already localised — or null. */
  now: string | null;
}

const LABEL: CSSProperties = { fontSize: 12, color: '#7C6A61', fontWeight: 700 };
const ROW: CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: '6px 0',
  borderTop: '1px solid #EADFD5',
};
const CLOSE: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 44,
  fontSize: 16,
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
};

function StatBar({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 }}>
      <span style={{ ...LABEL, width: 86 }}>{label}</span>
      <span style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <i
            key={i}
            style={{
              display: 'inline-block',
              width: 14,
              height: 8,
              borderRadius: 2,
              background: i < value ? '#B03A2E' : '#EADFD5',
            }}
          />
        ))}
      </span>
      <span style={{ fontSize: 13, color: '#2E2A28' }}>{value}</span>
    </div>
  );
}

export function PathogenCard({
  subject,
  onClose,
}: {
  subject: PathogenCardSubject;
  onClose: () => void;
}): ReactElement {
  const { disease, type } = subject;
  const info = (
    DZINFO as Record<
      string,
      { d?: string; c?: string; w?: string; p?: string; r?: string } | undefined
    >
  )[disease];
  const stats = (
    DZSTATS as Record<string, readonly [number, number, number, number, string] | undefined>
  )[disease];
  const fact = (FACT as Record<string, string | undefined>)[disease];
  const tropism = (TROPISM as Record<string, readonly string[] | 'any' | undefined>)[disease];
  const famKey = (FAMILY as Record<string, string | undefined>)[disease];
  const fam = famKey
    ? (FAMILIES as Record<string, { name?: string; bio?: string } | undefined>)[famKey]
    : undefined;
  const beat = (BEAT_BY_TYPE as Record<string, string | undefined>)[type];
  const organName = (o: string): string =>
    String((ORGANS as Record<string, { name?: string } | undefined>)[o]?.name ?? o);

  return (
    <div
      role="dialog"
      aria-label={t('card.title')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(46,42,40,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: 'min(92vw, 420px)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#FFFDF9',
          border: '2px solid #B03A2E',
          borderRadius: 12,
          padding: 14,
          fontSize: 14,
          color: '#2E2A28',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={`/art/path-${type}@3x.webp`} width={48} height={48} alt="" />
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#B03A2E' }}>{disease}</div>
            <div style={{ fontSize: 13, color: '#7C6A61' }}>
              {typeDisplayName(type)}
              {fam?.name ? (
                <>
                  {' '}
                  {t('inspect.sep')} {fam.name}
                </>
              ) : null}
            </div>
          </div>
        </div>
        {subject.remembered ? (
          <div style={{ marginTop: 8, fontSize: 13, color: '#1F6F8B', fontWeight: 700 }}>
            {t('card.memory')}
          </div>
        ) : null}
        {subject.now !== null ? (
          <div style={{ marginTop: 8 }}>
            <div style={LABEL}>{t('card.nowLabel')}</div>
            <div style={{ color: '#7A5600', fontWeight: 700 }}>{subject.now}</div>
          </div>
        ) : null}
        {fam?.bio ? (
          <div style={{ marginTop: 8 }}>
            <div style={LABEL}>{t('card.family')}</div>
            <div>{fam.bio}</div>
          </div>
        ) : null}
        <div style={{ marginTop: 8 }}>
          <div style={LABEL}>{t('card.canInfect')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {tropism === 'any' ? (
              <span
                style={{
                  border: '1.5px solid #B03A2E',
                  color: '#B03A2E',
                  borderRadius: 8,
                  padding: '2px 8px',
                }}
              >
                {t('card.anyOrgan')}
              </span>
            ) : (
              (tropism ?? []).map((o) => (
                <span
                  key={o}
                  style={{
                    border: '1.5px solid #8E6E53',
                    color: '#8E6E53',
                    borderRadius: 8,
                    padding: '2px 8px',
                  }}
                >
                  {organName(o)}
                </span>
              ))
            )}
          </div>
        </div>
        {fact ? (
          <div style={{ marginTop: 8, fontStyle: 'italic', color: '#7C6A61' }}>{fact}</div>
        ) : null}
        {beat ? (
          <div style={{ marginTop: 8 }}>
            <div style={LABEL}>{t('card.beatIt')}</div>
            <div>{beat}</div>
          </div>
        ) : null}
        {stats ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...LABEL, marginBottom: 4 }}>
              {t('card.tier')} {t('inspect.sep')} {stats[4]}
            </div>
            <StatBar label={t('card.contagion')} value={stats[0]} />
            <StatBar label={t('card.severity')} value={stats[1]} />
            <StatBar label={t('card.speed')} value={stats[2]} />
            <StatBar label={t('card.cunning')} value={stats[3]} />
          </div>
        ) : null}
        {info ? (
          <div style={{ marginTop: 10 }}>
            {(
              [
                ['card.discovered', info.d],
                ['card.causes', info.c],
                ['card.found', info.w],
                ['card.prevent', info.p],
                ['card.treat', info.r],
              ] as const
            ).map(([key, text]) =>
              text ? (
                <div key={key} style={ROW}>
                  <span style={{ ...LABEL, width: 86, flex: '0 0 auto' }}>{t(key)}</span>
                  <span>{text}</span>
                </div>
              ) : null,
            )}
          </div>
        ) : null}
        <button style={{ ...CLOSE, marginTop: 12 }} onClick={onClose}>
          {t('card.close')}
        </button>
      </div>
    </div>
  );
}
