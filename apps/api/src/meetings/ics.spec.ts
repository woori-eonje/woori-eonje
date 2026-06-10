import { buildICS } from './ics';

describe('buildICS', () => {
  const base = {
    meetingId: 7,
    title: '6월 전시 모임',
    description: '전시 보러 갈 사람들',
    startAt: new Date('2026-06-01T09:00:00Z'),
    endAt: new Date('2026-06-01T11:00:00Z'),
  };

  it('필수 VEVENT 라인과 UTC 시각을 생성한다', () => {
    const ics = buildICS(base);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('VERSION:2.0\r\n');
    expect(ics).toContain('PRODID:-//woori-eonje//KO\r\n');
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('UID:7@woori-eonje\r\n');
    expect(ics).toContain('DTSTART:20260601T090000Z\r\n');
    expect(ics).toContain('DTEND:20260601T110000Z\r\n');
    expect(ics).toContain('SUMMARY:6월 전시 모임\r\n');
    expect(ics).toContain('END:VEVENT\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('DTSTAMP 는 UTC basic 포맷이다', () => {
    expect(buildICS(base)).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/);
  });

  it('모든 콘텐츠 라인이 CRLF 로 끝난다', () => {
    const ics = buildICS(base);
    // \n 은 항상 \r\n 의 일부 — 단독 LF 가 없어야 한다.
    expect(
      ics.split('\n').every((seg) => seg === '' || seg.endsWith('\r')),
    ).toBe(true);
  });

  it('SUMMARY/DESCRIPTION 특수문자를 RFC5545 로 이스케이프한다', () => {
    const ics = buildICS({
      ...base,
      title: '전시, 모임; a\\b',
      description: '첫째 줄\n둘째 줄',
    });
    expect(ics).toContain('SUMMARY:전시\\, 모임\\; a\\\\b\r\n');
    expect(ics).toContain('DESCRIPTION:첫째 줄\\n둘째 줄\r\n');
  });

  it('description 이 null 이면 DESCRIPTION 라인을 생략한다', () => {
    const ics = buildICS({ ...base, description: null });
    expect(ics).not.toContain('DESCRIPTION:');
  });
});
