import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';
import { useWorkflowById, useTriggers } from '../api/workflows';
import { LoadingSpinner } from '../components/LoadingSpinner';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScheduleEvent {
  triggerId: string;
  triggerType: string;
  date: Date;
  label: string;
  isActive: boolean;
}

/**
 * Parse a cron expression into approximate next occurrences within a month
 * Supports: minute hour dayOfMonth month dayOfWeek
 */
function getCronOccurrences(
  cronExpression: string,
  year: number,
  month: number,
  _timezone: string,
): Date[] {
  const dates: Date[] = [];
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return dates;

  const [minutePart, hourPart, dayPart, monthPart, dowPart] = parts;

  // Check if this cron matches the given month
  if (monthPart !== '*' && !monthPart.split(',').includes(String(month + 1))) {
    return dates;
  }

  const daysInMonth = getDaysInMonth(year, month);
  const minute = minutePart === '*' ? 0 : parseInt(minutePart, 10);
  const hour = hourPart === '*' ? 9 : parseInt(hourPart, 10);

  // Determine which days of the month match
  const matchingDays: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();

    let dayMatch = false;
    let dowMatch = false;

    // Day of month matching
    if (dayPart === '*') {
      dayMatch = true;
    } else {
      const dayValues = expandCronField(dayPart, 1, 31);
      dayMatch = dayValues.includes(d);
    }

    // Day of week matching
    if (dowPart === '*') {
      dowMatch = true;
    } else {
      const dowValues = expandCronField(dowPart, 0, 6);
      dowMatch = dowValues.includes(dow);
    }

    // Both day-of-month and day-of-week must match when both are specified
    if (dayPart !== '*' && dowPart !== '*') {
      if (dayMatch || dowMatch) matchingDays.push(d);
    } else if (dayMatch && dowMatch) {
      matchingDays.push(d);
    }
  }

  for (const day of matchingDays) {
    dates.push(new Date(year, month, day, hour, minute));
  }

  return dates;
}

function expandCronField(field: string, min: number, max: number): number[] {
  const values: number[] = [];
  const dayMap: Record<string, number> = {
    SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  };

  for (const part of field.split(',')) {
    // Handle step values like */2
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      const start = range === '*' ? min : parseInt(range, 10);
      for (let i = start; i <= max; i += step) {
        values.push(i);
      }
    } else if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      for (let i = start; i <= end; i++) {
        values.push(i);
      }
    } else if (part === '*') {
      for (let i = min; i <= max; i++) {
        values.push(i);
      }
    } else {
      const upper = part.toUpperCase();
      const val = dayMap[upper] ?? parseInt(part, 10);
      if (!isNaN(val)) values.push(val);
    }
  }

  return values;
}

export function WorkflowScheduleCalendar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflowById(id || '');
  const { data: triggers = [] } = useTriggers(id || '');

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const events = useMemo<ScheduleEvent[]>(() => {
    const result: ScheduleEvent[] = [];

    for (const trigger of triggers) {
      if (trigger.type === 'scheduled' && trigger.schedule) {
        const occurrences = getCronOccurrences(
          trigger.schedule.cronExpression,
          currentYear,
          currentMonth,
          trigger.schedule.timezone,
        );

        for (const date of occurrences) {
          result.push({
            triggerId: trigger.id,
            triggerType: trigger.type,
            date,
            label: `${trigger.schedule.cronExpression} (${trigger.schedule.timezone})`,
            isActive: trigger.isActive,
          });
        }
      }

      // Show next run date if available
      if (trigger.schedule?.nextRunAt) {
        const nextRun = new Date(trigger.schedule.nextRunAt);
        if (
          nextRun.getMonth() === currentMonth &&
          nextRun.getFullYear() === currentYear
        ) {
          const alreadyHas = result.some(
            (e) =>
              e.triggerId === trigger.id &&
              e.date.getDate() === nextRun.getDate(),
          );
          if (!alreadyHas) {
            result.push({
              triggerId: trigger.id,
              triggerType: trigger.type,
              date: nextRun,
              label: 'Scheduled next run',
              isActive: trigger.isActive,
            });
          }
        }
      }
    }

    return result;
  }, [triggers, currentMonth, currentYear]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [daysInMonth, firstDay]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!workflow) return <div className="p-8 text-center">Workflow not found</div>;

  const scheduledTriggers = triggers.filter((t) => t.type === 'scheduled');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/workflows/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold">{workflow.name}</h1>
            <p className="text-sm text-gray-500">Execution Schedule Calendar</p>
          </div>
        </div>
      </div>

      {scheduledTriggers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Clock size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No scheduled triggers configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Add a scheduled trigger to this workflow to see executions on the calendar
          </p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-6">
            {scheduledTriggers.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-3 h-3 rounded-full ${
                    t.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-gray-700">
                  {t.schedule?.cronExpression} ({t.schedule?.timezone})
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    t.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayEvents = day
                  ? events.filter((e) => e.date.getDate() === day)
                  : [];
                const isToday =
                  day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear();

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-b border-r border-gray-100 p-2 ${
                      !day ? 'bg-gray-50' : ''
                    } ${isToday ? 'bg-indigo-50' : ''}`}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                              : 'text-gray-700'
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayEvents.map((evt, i) => (
                            <div
                              key={i}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${
                                evt.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                              title={evt.label}
                            >
                              <Zap size={10} className="inline mr-0.5" />
                              {evt.date.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
