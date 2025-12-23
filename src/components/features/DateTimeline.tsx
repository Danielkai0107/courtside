import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import styles from "./DateTimeline.module.scss";
import type { Tournament } from "../../types";

export interface DateTimelineProps {
  tournaments: Tournament[];
  className?: string;
}

interface DateGroup {
  date: string;
  displayDate: string;
  isPast: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  count: number;
}

const DateTimeline: React.FC<DateTimelineProps> = ({
  tournaments,
  className,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);

  // 將賽事按日期分組
  useEffect(() => {
    const groups = new Map<string, Tournament[]>();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    tournaments.forEach((tournament) => {
      // 優先使用 startDate，向下相容 date
      const tournamentDate = tournament.startDate || tournament.date;
      if (!tournamentDate) return;

      const date = tournamentDate.toDate();
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD 格式
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(tournament);
    });

    // 轉換為 DateGroup 數組並排序
    const dateGroupArray: DateGroup[] = Array.from(groups.entries())
      .map(([dateKey, tournamentsInDate]) => {
        const date = new Date(dateKey);
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // 格式化為 "月/日" 例如: "12/27"
        const month = date.getMonth() + 1;
        const day = date.getDate();

        return {
          date: dateKey,
          displayDate: `${month}/${day}`,
          isPast: dateOnly < today,
          isToday: dateOnly.getTime() === today.getTime(),
          isUpcoming: dateOnly > today,
          count: tournamentsInDate.length,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDateGroups(dateGroupArray);
  }, [tournaments]);

  // 自動滾動到近期賽事
  useEffect(() => {
    if (!timelineRef.current || dateGroups.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 找到最接近當前的日期（今天或最近的未來日期）
    let targetIndex = 0;
    for (let i = 0; i < dateGroups.length; i++) {
      const dateOnly = new Date(dateGroups[i].date);
      if (dateOnly >= today) {
        targetIndex = i;
        break;
      }
    }

    // 如果沒有未來日期，滾動到最後一個
    if (targetIndex === 0 && dateGroups.length > 0) {
      targetIndex = dateGroups.length - 1;
    }

    const targetElement = timelineRef.current.children[targetIndex] as HTMLElement;
    if (targetElement) {
      setTimeout(() => {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [dateGroups]);

  return (
    <div className={clsx(styles.dateTimeline, className)} ref={timelineRef}>
      {dateGroups.map((group, index) => (
        <div
          key={group.date}
          className={clsx(styles.dateItem, {
            [styles.past]: group.isPast,
            [styles.today]: group.isToday,
            [styles.upcoming]: group.isUpcoming,
            [styles.isFirst]: index === 0,
          })}
        >
          <div className={styles.dateText}>{group.displayDate}</div>
          <div className={styles.dotLine}>
            <div className={styles.dot}></div>
            <div className={styles.line}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DateTimeline;
