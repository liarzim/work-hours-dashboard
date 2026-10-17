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
  onOpenOvertimeModal?: () => void;
}

export default function KpiCards({ summary, onOpenMissingModal, onOpenOvertimeModal }: Props) {
  const { data: missingData, isLoading } = useMissingReports();
  const missingCount = missingData?.count ?? 0;

  const showEstimation =
    summary.estimatedVacationBalanceYearEnd !== undefined &&
    summary.estimatedVacationBalanceYearEnd !== summary.vacationBalance;

  const otHours = summary.overtimeHoursThisMonth || 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card
        title="שעות שדווחו"
        value={`${summary.reportedHours.toFixed(1)} שעות`}
        sub={
          <div className="space-y-0.5">
            <div>
              {summary.targetHours > 0
                ? `מתוך יעד של ${summary.targetHours.toFixed(1)}`
                : "עובד שעתי (ללא יעד)"}
            </div>
            {otHours > 0 ? (
              <div className="text-[11px] font-semibold text-indigo-600">
                <span>⏱️ {otHours.toFixed(1)} שעות נוספות</span>
                {summary.activeEmploymentTerm?.hourlyRate ? (
                  <span className="text-emerald-600 mr-1">
                    {summary.activeEmploymentTerm.employmentType === "hourly"
                      ? `(שווי ₪${(summary.overtimeFullPay || 0).toLocaleString()})`
                      : `(תוספת ₪${(summary.overtimeAdditionPay || 0).toLocaleString()})`}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal mr-1">• לא הוגדר ערך שעה</span>
                )}
              </div>
            ) : summary.activeEmploymentTerm?.hourlyRate ? (
              <div className="text-[11px] font-medium text-slate-500">
                ערך שעה: ₪{summary.activeEmploymentTerm.hourlyRate}
              </div>
            ) : null}
          </div>
        }
        icon={<ClockIcon className="h-5 w-5 text-brand-600" />}
        iconBg="bg-brand-50"
        onClick={otHours > 0 ? onOpenOvertimeModal : undefined}
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