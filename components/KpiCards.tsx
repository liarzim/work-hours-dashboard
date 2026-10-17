"use client";

import { MonthSummary } from "@/lib/types";
import { AlertTriangleIcon, BriefcaseIcon, ClockIcon, TrendIcon, UmbrellaIcon } from "./Icons";
import { useMissingReports } from "@/lib/client";

function Card({
  title,
  value,
  sub,
  icon,
  iconBg,
  valueClass = "text-slate-900",
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-card ${
        onClick
          ? "cursor-pointer transition hover:border-amber-300 hover:shadow-md hover:ring-2 hover:ring-amber-100/80"
          : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

interface Props {
  summary: MonthSummary;
  onOpenMissingModal?: () => void;
}

export default function KpiCards({ summary, onOpenMissingModal }: Props) {
  const { data: missingData, isLoading } = useMissingReports();
  const missingCount = missingData?.count ?? 0;

  const showEstimation =
    summary.estimatedVacationBalanceYearEnd !== undefined &&
    summary.estimatedVacationBalanceYearEnd !== summary.vacationBalance;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card
        title="שעות שדווחו"
        value={`${summary.reportedHours.toFixed(1)} שעות`}
        sub={`מתוך יעד של ${summary.targetHours.toFixed(1)}`}
        icon={<ClockIcon className="h-5 w-5 text-brand-600" />}
        iconBg="bg-brand-50"
      />
      <Card
        title="שעות שנותרו"
        value={`${summary.remainingHours.toFixed(1)} שעות`}
        sub={`כ- ${summary.forecastHoursPerDay.toFixed(1)} ליום`}
        icon={<TrendIcon className="h-5 w-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
      />
      <Card
        title="יתרת חופשה לניצול"
        value={`${summary.vacationBalance.toFixed(1)} ימים`}
        valueClass="text-red-600"
        sub={
          <div className="space-y-1">
            <p>{`${summary.vacationUsedThisMonth} נוצלו החודש`}</p>
            {showEstimation && (
              <p className="font-semibold text-amber-600 mt-1">
                {`הערכה לסוף השנה (כולל עתידיים): ${summary.estimatedVacationBalanceYearEnd?.toFixed(1)} ימים`}
              </p>
            )}
          </div>
        }
        icon={<UmbrellaIcon className="h-5 w-5 text-amber-500" />}
        iconBg="bg-amber-50"
      />
      <Card
        title="מילואים / מחלה"
        value={`${summary.reserveDaysThisMonth} / ${summary.sickDaysThisMonth}`}
        sub="ימי היעדרות החודש"
        icon={<BriefcaseIcon className="h-5 w-5 text-indigo-500" />}
        iconBg="bg-indigo-50"
      />
      <Card
        title="דיווחים חסרים"
        value={isLoading ? "טוען..." : `${missingCount} ימים`}
        valueClass={missingCount > 0 ? "text-amber-600 font-extrabold" : "text-emerald-600"}
        sub={
          missingCount > 0 ? (
            <span className="font-medium text-amber-700">
              כולל חודשים קודמים • לחץ לעדכון ⚡
            </span>
          ) : (
            <span className="text-emerald-600 font-medium">
              מעולה! אין דיווחים חסרים
            </span>
          )
        }
        icon={
          <AlertTriangleIcon
            className={`h-5 w-5 ${
              missingCount > 0 ? "text-amber-600 animate-pulse" : "text-emerald-600"
            }`}
          />
        }
        iconBg={missingCount > 0 ? "bg-amber-100" : "bg-emerald-50"}
        onClick={onOpenMissingModal}
      />
    </div>
  );
}