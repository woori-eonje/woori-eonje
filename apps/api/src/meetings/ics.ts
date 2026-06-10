// 외부 라이브러리 없이 RFC5545 최소 VEVENT iCalendar 문자열을 생성한다.
// 줄바꿈은 CRLF, 시각은 UTC basic 포맷(YYYYMMDDTHHMMSSZ).

export interface ICSInput {
  meetingId: number;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
}

// Date → YYYYMMDDTHHMMSSZ (UTC).
function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

// SUMMARY/DESCRIPTION 텍스트 값 이스케이프 (RFC5545 3.3.11): \ ; , 개행.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

export function buildICS(input: ICSInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//woori-eonje//KO',
    'BEGIN:VEVENT',
    `UID:${input.meetingId}@woori-eonje`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(input.startAt)}`,
    `DTEND:${formatUtc(input.endAt)}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // RFC5545: 각 줄(콘텐츠 라인)은 CRLF 로 종료된다.
  return lines.map((line) => `${line}\r\n`).join('');
}
