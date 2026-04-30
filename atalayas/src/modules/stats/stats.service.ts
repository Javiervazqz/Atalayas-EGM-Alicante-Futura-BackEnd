import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { User, statusType } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStats(requestUser: User) {
    const isGeneral = requestUser.role === 'GENERAL_ADMIN';
    const companyFilter = isGeneral
      ? {}
      : { companyId: requestUser.companyId ?? undefined };
    const enrollmentFilter = isGeneral
      ? {}
      : { User: { companyId: requestUser.companyId ?? undefined } };

    const [
      totalCompanies,
      totalUsers,
      totalEmployees,
      totalAdmins,
      totalCourses,
      publicCourses,
      totalEnrollments,
      completedEnrollments,
      totalDocuments,
      totalServices,
      pendingRequests,
      recentUsers,
      recentCourses,
      topCourses,
      progressAggregate,
    ] = await Promise.all([
      isGeneral ? this.prisma.company.count() : Promise.resolve(1),
      this.prisma.user.count({ where: companyFilter }),
      this.prisma.user.count({ where: { ...companyFilter, role: 'EMPLOYEE' } }),
      this.prisma.user.count({ where: { ...companyFilter, role: 'ADMIN' } }),
      this.prisma.course.count({ where: companyFilter }),
      this.prisma.course.count({ where: { ...companyFilter, isPublic: true } }),
      this.prisma.enrollment.count({ where: enrollmentFilter }),
      this.prisma.enrollment.count({ where: { ...enrollmentFilter, progress: 100 } }),
      this.prisma.document.count({ where: companyFilter }),
      this.prisma.service.count({ where: companyFilter }),
      isGeneral
        ? this.prisma.companyRequest.count({ where: { status: statusType.PENDING } })
        : Promise.resolve(0),
      this.prisma.user.findMany({
        where: companyFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, email: true, role: true,
          createdAt: true, avatarUrl: true,
          Company: { select: { name: true } },
        },
      }),
      this.prisma.course.findMany({
        where: companyFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, title: true, isPublic: true,
          createdAt: true, category: true,
          Company: { select: { name: true } },
        },
      }),
      this.prisma.course.findMany({
        where: companyFilter,
        take: 5,
        select: { id: true, title: true, _count: { select: { Enrollment: true } } },
        orderBy: { Enrollment: { _count: 'desc' } },
      }),
      this.prisma.enrollment.aggregate({
        _avg: { progress: true },
        where: enrollmentFilter,
      }),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [usersByMonth, companiesByMonth] = await Promise.all([
      this.prisma.user.findMany({
        where: { ...companyFilter, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      isGeneral
        ? this.prisma.company.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      overview: {
        totalCompanies,
        totalUsers,
        totalEmployees,
        totalAdmins,
        totalCourses,
        publicCourses,
        totalEnrollments,
        completedEnrollments,
        completionRate:
          totalEnrollments > 0
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 0,
        avgProgress: Math.round(progressAggregate._avg.progress ?? 0),
        totalDocuments,
        totalServices,
        pendingRequests,
      },
      recent: { users: recentUsers, courses: recentCourses },
      top: { courses: topCourses },
      trends: { usersByMonth, companiesByMonth },
    };
  }
}
