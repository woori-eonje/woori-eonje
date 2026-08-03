import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@whenwe/types';
import { DomainException } from './domain-exception';

// 모임 관련 owner 엔드포인트(getMeeting·recommendations·필수참석자·확정 등)가 공유하는
// 소유자 검증. 이미 로드한 meeting 을 받아 추가 쿼리 없이 404/403 을 던진다.

export function meetingNotFound(): DomainException {
  return new DomainException(
    ErrorCode.MEETING_NOT_FOUND,
    HttpStatus.NOT_FOUND,
    '모임을 찾을 수 없습니다.',
  );
}

export function forbiddenMeetingOwnerOnly(): DomainException {
  return new DomainException(
    ErrorCode.FORBIDDEN_MEETING_OWNER_ONLY,
    HttpStatus.FORBIDDEN,
    '모임장만 접근할 수 있습니다.',
  );
}

export function participantNotFound(): DomainException {
  return new DomainException(
    ErrorCode.PARTICIPANT_NOT_FOUND,
    HttpStatus.NOT_FOUND,
    '참여자를 찾을 수 없습니다.',
  );
}

/** 모임이 존재하고(404) 그 owner 가 userId 인지(403) 보장. 통과 시 meeting 은 non-null 로 좁혀진다. */
export function assertMeetingOwner<T extends { ownerId: number }>(
  meeting: T | null,
  userId: number,
): asserts meeting is T {
  if (!meeting) throw meetingNotFound();
  if (meeting.ownerId !== userId) throw forbiddenMeetingOwnerOnly();
}
