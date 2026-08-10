import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: AuthenticatedUser) {
    const tenantId = user.tenantId;

    const [
      byStatusRaw,
      licensesCount,
      pendingUsers,
      topObserved,
      recentActivity,
      auditTransitions,
    ] = await Promise.all([
      this.prisma.application.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.license.count({
        where: { application: { tenantId } },
      }),
      this.prisma.user.count({
        where: { tenantId, status: 'PENDING_APPROVAL' },
      }),
      this.prisma.observation.groupBy({
        by: ['documentId'],
        where: {
          application: { tenantId },
          documentId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          user: { select: { fullName: true } },
          application: { select: { id: true, formCode: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          applicationId: { not: null },
          toStatus: { not: null },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          applicationId: true,
          fromStatus: true,
          toStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const byStatus = Object.values(ApplicationStatus).map((status) => ({
      status,
      count: byStatusRaw.find((r) => r.status === status)?._count._all ?? 0,
    }));

    const totalApplications = byStatus.reduce((sum, s) => sum + s.count, 0);
    const inCorrection = byStatus.find((s) => s.status === 'EN_CORRECCION')?.count ?? 0;
    const pendingPayment = byStatus.find((s) => s.status === 'PENDIENTE_DE_PAGO')?.count ?? 0;
    const inReview = byStatus.find((s) => s.status === 'EN_REVISION_TECNICA')?.count ?? 0;

    // Ranking de documentos observados: agregar por requisito (no por versión)
    const docIds = topObserved
      .map((o) => o.documentId)
      .filter((id): id is string => Boolean(id));
    const docs = docIds.length
      ? await this.prisma.applicationDocument.findMany({
          where: { id: { in: docIds } },
          select: {
            id: true,
            requirement: { select: { code: true, name: true } },
          },
        })
      : [];
    const byRequirement = new Map<string, { code: string; name: string; count: number }>();
    for (const row of topObserved) {
      if (!row.documentId) continue;
      const doc = docs.find((d) => d.id === row.documentId);
      if (!doc) continue;
      const key = doc.requirement.code;
      const prev = byRequirement.get(key);
      const add = row._count._all;
      if (prev) prev.count += add;
      else byRequirement.set(key, { code: key, name: doc.requirement.name, count: add });
    }
    const topObservedDocuments = [...byRequirement.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const avgDaysByPhase = this.computeAvgDaysByPhase(auditTransitions);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalApplications,
        licensesIssued: licensesCount,
        inReview,
        inCorrection,
        pendingPayment,
        pendingUserApprovals: pendingUsers,
      },
      byStatus,
      avgDaysByPhase,
      topObservedDocuments,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        createdAt: a.createdAt,
        userName: a.user?.fullName ?? null,
        applicationId: a.application?.id ?? null,
        formCode: a.application?.formCode ?? null,
      })),
    };
  }

  /**
   * Duración media (días) en cada estado, a partir de la secuencia de
   * transiciones auditadas por expediente.
   */
  private computeAvgDaysByPhase(
    transitions: {
      applicationId: string | null;
      fromStatus: ApplicationStatus | null;
      toStatus: ApplicationStatus | null;
      createdAt: Date;
    }[],
  ) {
    const durations = new Map<ApplicationStatus, number[]>();

    const byApp = new Map<string, typeof transitions>();
    for (const t of transitions) {
      if (!t.applicationId || !t.toStatus) continue;
      const list = byApp.get(t.applicationId) ?? [];
      list.push(t);
      byApp.set(t.applicationId, list);
    }

    for (const logs of byApp.values()) {
      for (let i = 0; i < logs.length; i++) {
        const current = logs[i];
        const prev = i > 0 ? logs[i - 1] : null;
        // Tiempo que el expediente pasó en fromStatus antes de llegar a toStatus
        if (current.fromStatus && prev) {
          const days = (current.createdAt.getTime() - prev.createdAt.getTime()) / MS_PER_DAY;
          if (days >= 0) {
            const arr = durations.get(current.fromStatus) ?? [];
            arr.push(days);
            durations.set(current.fromStatus, arr);
          }
        }
      }
    }

    return Object.values(ApplicationStatus)
      .map((status) => {
        const samples = durations.get(status) ?? [];
        const avgDays =
          samples.length === 0
            ? null
            : Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 10) / 10;
        return { status, avgDays, samples: samples.length };
      })
      .filter((r) => r.samples > 0);
  }
}
