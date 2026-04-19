"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export type SDRMetrics = {
  totalAttendants: { sdr: number; closer: number; all: number };
  today: {
    leadsWorked: number; // outbound leads touched today
    messagesSent: number;
    emailsSent: number;
    emailsOpened: number;
    sqlsHandedOff: number;
  };
  cadences: {
    active: number;
    enrolled: number;
    completed: number;
  };
  funnel: {
    outboundLeads: number;
    contactedOutbound: number;
    sqlOutbound: number;
    meetingsBooked: number;
  };
  attendants: {
    id: string;
    name: string;
    role: string;
    dailyActivityGoal: number;
    todayActivity: number;
    activeLeads: number;
  }[];
};

export async function getSDRMetrics(): Promise<SDRMetrics> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      totalAttendants: { sdr: 0, closer: 0, all: 0 },
      today: {
        leadsWorked: 0,
        messagesSent: 0,
        emailsSent: 0,
        emailsOpened: 0,
        sqlsHandedOff: 0,
      },
      cadences: { active: 0, enrolled: 0, completed: 0 },
      funnel: {
        outboundLeads: 0,
        contactedOutbound: 0,
        sqlOutbound: 0,
        meetingsBooked: 0,
      },
      attendants: [],
    };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    attendants,
    messagesSentToday,
    emailsSentToday,
    emailsOpenedToday,
    activeCadences,
    runningEnrollments,
    completedEnrollments,
    outboundLeads,
    contactedOutbound,
    sqlOutbound,
    meetingsStage,
  ] = await Promise.all([
    prisma.attendant.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.message.count({
      where: {
        lead: { userId: user.id },
        role: "assistant",
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.emailTracking.count({
      where: { userId: user.id, status: { in: ["sent", "opened"] }, sentAt: { gte: startOfDay } },
    }),
    prisma.emailTracking.count({
      where: { userId: user.id, status: "opened", openedAt: { gte: startOfDay } },
    }),
    prisma.workflow.count({
      where: { userId: user.id, isSequence: true, isActive: true },
    }),
    prisma.workflowExecution.count({
      where: {
        status: "running",
        workflow: { userId: user.id, isSequence: true },
      },
    }),
    prisma.workflowExecution.count({
      where: {
        status: "completed",
        workflow: { userId: user.id, isSequence: true },
      },
    }),
    prisma.lead.count({ where: { userId: user.id, leadType: "outbound" } }),
    prisma.lead.count({
      where: {
        userId: user.id,
        leadType: "outbound",
        messages: { some: { role: "assistant" } },
      },
    }),
    prisma.lead.count({
      where: { userId: user.id, leadType: "outbound", tags: { has: "sql" } },
    }),
    prisma.stage.findFirst({
      where: {
        userId: user.id,
        OR: [{ eventName: "Schedule" }, { name: { contains: "agen", mode: "insensitive" } }],
      },
      select: { id: true },
    }),
  ]);

  const meetingsBooked = meetingsStage
    ? await prisma.lead.count({
        where: { userId: user.id, leadType: "outbound", stageId: meetingsStage.id },
      })
    : 0;

  // per-attendant activity today
  const attendantsWithMetrics = await Promise.all(
    attendants.map(async (a) => {
      const [todayActivity, activeLeads] = await Promise.all([
        prisma.message.count({
          where: {
            role: "assistant",
            createdAt: { gte: startOfDay },
            lead: { userId: user.id, assignedTo: a.id },
          },
        }),
        prisma.lead.count({
          where: { userId: user.id, assignedTo: a.id },
        }),
      ]);
      return {
        id: a.id,
        name: a.name,
        role: a.role,
        dailyActivityGoal: a.dailyActivityGoal,
        todayActivity,
        activeLeads,
      };
    })
  );

  const sdrCount = attendants.filter((a) => a.role === "sdr" || a.role === "sdr_manager").length;
  const closerCount = attendants.filter(
    (a) => a.role === "closer" || a.role === "closer_manager"
  ).length;

  // Approximate "SQLs handed off today" = leads tagged sql + updated today
  const sqlsHandedOff = await prisma.lead.count({
    where: {
      userId: user.id,
      tags: { has: "sql" },
      updatedAt: { gte: startOfDay },
    },
  });

  return {
    totalAttendants: { sdr: sdrCount, closer: closerCount, all: attendants.length },
    today: {
      leadsWorked: messagesSentToday,
      messagesSent: messagesSentToday,
      emailsSent: emailsSentToday,
      emailsOpened: emailsOpenedToday,
      sqlsHandedOff,
    },
    cadences: {
      active: activeCadences,
      enrolled: runningEnrollments,
      completed: completedEnrollments,
    },
    funnel: {
      outboundLeads,
      contactedOutbound,
      sqlOutbound,
      meetingsBooked,
    },
    attendants: attendantsWithMetrics,
  };
}
