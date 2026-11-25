import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ReportStatus } from './domain';

export interface MediaAttachment {
  readonly type: string;
  readonly data: string;
}

export interface ReportHistoryEntry {
  readonly status: string;
  readonly date: string;
  readonly comment: string;
  readonly staff?: string | null;
}

export interface ReportClosure {
  readonly text: string;
  readonly crew: string;
  readonly closedAt: string;
}

export interface ReportCommentEntry {
  readonly id: string;
  readonly citizenId?: string;
  readonly name: string;
  readonly text: string;
  status: string;
  readonly date: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface ReportRecord {
  readonly id: string;
  readonly folio: string;
  readonly category: string;
  readonly description: string;
  readonly lat: number;
  readonly lng: number;
  readonly citizenId?: string;
  readonly reporterId?: string | null;
  status: ReportStatus | string;
  department: string;
  readonly createdAt: string;
  updatedAt: string;
  readonly anonymousName: string;
  readonly rut: string;
  readonly email: string;
  readonly phone: string;
  readonly supporters: string[];
  readonly severity: number;
  before: string | null;
  after: string | null;
  readonly media: MediaAttachment[];
  closure: ReportClosure | null;
  readonly history: ReportHistoryEntry[];
  comments?: ReportCommentEntry[];
}

export interface StaffRecord {
  readonly id: string;
  readonly email: string;
  passwordHash: string;
  readonly role: string;
  readonly department: string;
  readonly name: string;
}

export interface CitizenRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly rut: string;
  passwordHash: string;
  readonly createdAt: string;
  identityVerified?: boolean;
}

export interface ReporterIdentityRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly rut: string;
  readonly phone: string;
}

export interface VerificationRequestRecord {
  readonly id: string;
  readonly folio: string;
  readonly citizenId: string;
  readonly name: string;
  readonly email: string;
  readonly rut: string;
  status: string;
  readonly createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote?: string;
}

export interface AuditEventRecord {
  readonly id: string;
  readonly reportId: string;
  readonly staffId?: string | null;
  readonly status: string;
  readonly date: string;
  readonly comment: string;
}

export interface NotificationRecord {
  readonly id: string;
  readonly citizenId: string;
  readonly reportId: string;
  readonly folio: string;
  readonly status: string;
  readonly message: string;
  readonly date: string;
  readAt: string | null;
}

export interface DatabaseState {
  reports: ReportRecord[];
  staff: StaffRecord[];
  citizens: CitizenRecord[];
  reporters: ReporterIdentityRecord[];
  verificationRequests: VerificationRequestRecord[];
  events: AuditEventRecord[];
  notifications: NotificationRecord[];
}

export interface ReportRepository {
  load(): DatabaseState;
  persist(state: DatabaseState): Promise<void>;
  loadHolidayCalendar(): Set<string>;
}

interface StoredRawFile {
  readonly schemaVersion?: number;
  readonly tables?: {
    readonly reports?: Array<Record<string, unknown>>;
    readonly staff?: StaffRecord[];
    readonly citizens?: CitizenRecord[];
    readonly reporters?: ReporterIdentityRecord[];
    readonly verificationRequests?: Array<Record<string, unknown>>;
    readonly events?: AuditEventRecord[];
    readonly reportHistory?: Array<{
      readonly id?: string;
      readonly reportId: string;
      readonly status: string;
      readonly date: string;
      readonly comment: string;
      readonly staff?: string | null;
      readonly staffId?: string | null;
    }>;
    readonly notifications?: NotificationRecord[];
    readonly supporters?: Array<{ readonly reportId: string; readonly rutHash?: string; readonly rut?: string }>;
    readonly reportComments?: Array<ReportCommentEntry & { readonly reportId: string }>;
    readonly reportMedia?: Array<{ readonly reportId: string; readonly slot: string; readonly type: string; readonly data: string }>;
  };
  readonly reports?: ReportRecord[];
  readonly staff?: StaffRecord[];
  readonly citizens?: CitizenRecord[];
  readonly reporters?: ReporterIdentityRecord[];
  readonly verificationRequests?: VerificationRequestRecord[];
  readonly events?: AuditEventRecord[];
  readonly notifications?: NotificationRecord[];
}

export class JsonFileRepository implements ReportRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly dataDir: string,
    private readonly dbFile: string,
    private readonly piiSecret: string,
  ) {}

  public loadHolidayCalendar(): Set<string> {
    let source: unknown[] = [];
    try {
      if (process.env.REPORTA_HOLIDAYS) {
        source = process.env.REPORTA_HOLIDAYS.split(',');
      } else {
        const raw = JSON.parse(fs.readFileSync(path.join(this.dataDir, 'feriados.json'), 'utf8')) as
          | unknown[]
          | { readonly dates?: unknown[] };
        source = Array.isArray(raw) ? raw : raw.dates ?? [];
      }
    } catch {
      source = [];
    }
    if (!Array.isArray(source)) source = [];
    return new Set(
      source
        .map(x => String(x).trim())
        .filter(x => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
          const d = new Date(`${x}T12:00:00Z`);
          return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
        }),
    );
  }

  public load(): DatabaseState {
    try {
      const d = JSON.parse(fs.readFileSync(this.dbFile, 'utf8')) as StoredRawFile;
      if ((d.schemaVersion === 2 || d.schemaVersion === 3) && d.tables) {
        const t = d.tables;
        const citizens = t.citizens ?? [];
        const reporters = t.reporters ?? [];
        const staff = t.staff ?? [];
        const staffById = new Map(staff.map(x => [x.id, x]));
        const citizenById = new Map(citizens.map(c => [c.id, c]));
        const reporterById = new Map(reporters.map(c => [c.id, c]));

        const eventSource: Array<AuditEventRecord & { readonly staff?: string | null }> =
          t.events && t.events.length
            ? t.events
            : (t.reportHistory ?? []).map(x => ({
                id: x.id ?? `legacy-event-${x.reportId}-${x.date}`,
                reportId: x.reportId,
                staffId: x.staffId ?? null,
                status: x.status,
                date: x.date,
                comment: x.comment,
                staff: x.staff ?? null,
              }));

        const byReport = new Map<string, ReportRecord>();
        for (const row of t.reports ?? []) {
          const { reporterId, ...base } = row as Record<string, unknown> & { reporterId?: string | null };
          const idKey = String(row.id ?? '');
          const identity =
            typeof reporterId === 'string' && reporterId
              ? citizenById.get(reporterId) ?? reporterById.get(reporterId) ?? null
              : null;
          const reporterPhone =
            identity && 'phone' in identity ? String((identity as ReporterIdentityRecord).phone) : '';
          const v3Fields =
            d.schemaVersion === 3
              ? {
                  anonymousName: identity?.name ?? 'Vecino',
                  rut: identity?.rut ?? '',
                  email: identity?.email ?? '',
                  phone: reporterPhone,
                  ...(typeof reporterId === 'string' && citizenById.has(reporterId) ? { citizenId: reporterId } : {}),
                }
              : {
                  anonymousName: String(row.anonymousName ?? 'Vecino'),
                  rut: String(row.rut ?? ''),
                  email: String(row.email ?? ''),
                  phone: String(row.phone ?? ''),
                };

          byReport.set(idKey, {
            ...(base as unknown as Omit<ReportRecord, 'supporters' | 'history' | 'comments' | 'media' | 'before' | 'after' | 'anonymousName' | 'rut' | 'email' | 'phone'>),
            ...v3Fields,
            supporters: [],
            history: [],
            comments: [],
            media: [],
            before: null,
            after: null,
          });
        }

        for (const x of t.supporters ?? []) {
          const rep = byReport.get(x.reportId);
          const hashOrRut = x.rutHash ?? x.rut;
          if (rep && hashOrRut) rep.supporters.push(hashOrRut);
        }

        for (const x of eventSource) {
          const rep = byReport.get(x.reportId);
          if (rep) {
            const staffMember = x.staffId ? staffById.get(x.staffId) : undefined;
            rep.history.push({
              status: x.status,
              date: x.date,
              comment: x.comment,
              staff: x.staff ?? staffMember?.name ?? null,
            });
          }
        }

        for (const x of t.reportComments ?? []) {
          const rep = byReport.get(x.reportId);
          if (rep) {
            const author = x.citizenId ? citizenById.get(x.citizenId) : undefined;
            if (!rep.comments) rep.comments = [];
            rep.comments.push({
              ...x,
              name: x.name || author?.name || 'Vecino/a',
            });
          }
        }

        for (const x of t.reportMedia ?? []) {
          const rep = byReport.get(x.reportId);
          if (!rep) continue;
          if (x.slot === 'before') rep.before = x.data;
          else if (x.slot === 'after') rep.after = x.data;
          else rep.media.push({ type: x.type, data: x.data });
        }

        const verificationRequests: VerificationRequestRecord[] = (t.verificationRequests ?? []).map(rawV => {
          const v = rawV as unknown as VerificationRequestRecord;
          const c = citizenById.get(v.citizenId);
          return {
            ...v,
            name: v.name || c?.name || '',
            email: v.email || c?.email || '',
            rut: v.rut || c?.rut || '',
          };
        });

        return {
          reports: [...byReport.values()],
          staff,
          citizens,
          reporters,
          verificationRequests,
          events: eventSource.map(({ id, reportId, staffId, status, date, comment }) => ({
            id,
            reportId,
            staffId: staffId ?? null,
            status,
            date,
            comment,
          })),
          notifications: t.notifications ?? [],
        };
      }

      return {
        reports: d.reports ?? [],
        staff: d.staff ?? [],
        citizens: d.citizens ?? [],
        reporters: d.reporters ?? [],
        verificationRequests: d.verificationRequests ?? [],
        events: d.events ?? [],
        notifications: d.notifications ?? [],
      };
    } catch {
      return {
        reports: [],
        staff: [],
        citizens: [],
        reporters: [],
        verificationRequests: [],
        events: [],
        notifications: [],
      };
    }
  }

  public normalizedSnapshot(source: DatabaseState): Record<string, unknown> {
    const reports: Array<Record<string, unknown>> = [];
    const supporters: Array<{ readonly reportId: string; readonly rutHash: string }> = [];
    const reportComments: Array<Record<string, unknown>> = [];
    const reportMedia: Array<{ readonly reportId: string; readonly slot: string; readonly type: string; readonly data: string }> = [];
    const notifications = [...source.notifications];
    const reporters = [...source.reporters];
    const reporterById = new Map(reporters.map(x => [x.id, x]));
    const citizenById = new Map(source.citizens.map(x => [x.id, x]));

    for (const item of source.reports) {
      const {
        supporters: people = [],
        history: _timeline = [],
        comments = [],
        media = [],
        before,
        after,
        anonymousName,
        rut,
        email,
        phone,
        citizenId,
        reporterId,
        ...row
      } = item;

      let identityId: string | null = citizenId ?? reporterId ?? null;
      const hasIdentity = !!(rut || email || phone || (anonymousName && anonymousName !== 'Vecino'));

      if (!identityId && hasIdentity) {
        const normalizedRut = String(rut || '').replace(/[.\-\s]/g, '').toUpperCase();
        const key = normalizedRut || String(email || item.id).toLowerCase();
        identityId = `legacy-${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
        if (!reporterById.has(identityId)) {
          const identity: ReporterIdentityRecord = {
            id: identityId,
            name: anonymousName || 'Vecino',
            email: email || '',
            rut: rut || '',
            phone: phone || '',
          };
          reporters.push(identity);
          reporterById.set(identityId, identity);
        }
      } else if (identityId && !citizenById.has(identityId) && hasIdentity && !reporterById.has(identityId)) {
        const identity: ReporterIdentityRecord = {
          id: identityId,
          name: anonymousName || 'Vecino',
          email: email || '',
          rut: rut || '',
          phone: phone || '',
        };
        reporters.push(identity);
        reporterById.set(identityId, identity);
      }

      reports.push({ ...row, reporterId: identityId });

      for (const rut0 of people) {
        const rutHash = /^[a-f0-9]{64}$/i.test(rut0)
          ? rut0
          : crypto
              .createHmac('sha256', this.piiSecret)
              .update(String(rut0).replace(/[.\-\s]/g, '').toUpperCase())
              .digest('hex');
        supporters.push({ reportId: item.id, rutHash });
      }

      for (const c of comments) {
        const { name: authorName, ...comment } = c;
        reportComments.push({
          reportId: item.id,
          ...comment,
          ...(c.citizenId ? {} : { name: authorName }),
        });
      }

      if (before) reportMedia.push({ reportId: item.id, slot: 'before', type: 'image/evidence', data: before });
      if (after) reportMedia.push({ reportId: item.id, slot: 'after', type: 'image/evidence', data: after });
      for (const m of media) {
        if (m.data !== before && m.data !== after) {
          reportMedia.push({ reportId: item.id, slot: 'attachment', type: m.type, data: m.data });
        }
      }
    }

    return {
      schemaVersion: 3,
      tables: {
        reports,
        staff: source.staff,
        citizens: source.citizens,
        reporters,
        verificationRequests: source.verificationRequests.map(
          ({ id: rid, folio, citizenId, status, createdAt, reviewedBy, reviewedAt, reviewNote }) => ({
            id: rid,
            folio,
            citizenId,
            status,
            createdAt,
            reviewedBy,
            reviewedAt,
            reviewNote,
          }),
        ),
        events: source.events,
        notifications,
        supporters,
        reportComments,
        reportMedia,
      },
    };
  }

  public persist(state: DatabaseState): Promise<void> {
    const snapshot = JSON.stringify(this.normalizedSnapshot(state), null, 2);
    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        const temp = `${this.dbFile}.${process.pid}.tmp`;
        await fs.promises.writeFile(temp, snapshot);
        await fs.promises.rename(temp, this.dbFile);
      });
    return this.writeQueue;
  }
}
