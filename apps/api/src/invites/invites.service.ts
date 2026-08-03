import { randomUUID } from 'node:crypto';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import {
  ErrorCode,
  type InvitePublic,
  type ParticipantRegistered,
  type ParticipantSessionRequest,
  type ParticipantSessionResult,
  type RegisterParticipantRequest,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain-exception';
import { resolveOptionalUserId } from '../auth/optional-bearer';
import { normalizeNickname } from './nickname';

const PIN_PATTERN = /^\d{4}$/;
const PIN_BCRYPT_ROUNDS = 10; // auth.service.ts 의 BCRYPT_ROUNDS 와 동일 정책.
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 10 * 60 * 1000; // 10분
// 존재하지 않는 닉네임/PIN 미설정 참여자에 대해서도 동일 시간이 걸리도록 더미 비교를 수행
// (auth.service.ts 의 DUMMY_PASSWORD_HASH 와 같은 타이밍 사이드채널 방지 패턴).
const DUMMY_PIN_HASH = hashSync('0000', PIN_BCRYPT_ROUNDS);

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getInvite(inviteToken: string): Promise<InvitePublic> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { inviteToken },
    });

    if (!meeting) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_INVALID,
        HttpStatus.NOT_FOUND,
        '유효하지 않은 초대 링크입니다.',
      );
    }

    if (
      meeting.inviteTokenExpiresAt &&
      meeting.inviteTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_EXPIRED,
        HttpStatus.GONE,
        '만료된 초대 링크입니다.',
      );
    }

    return {
      meetingId: meeting.id,
      title: meeting.title,
      description: meeting.description,
      category: meeting.category,
      status: meeting.status,
      startDate: meeting.startDate.toISOString().slice(0, 10),
      endDate: meeting.endDate.toISOString().slice(0, 10),
      durationHours: meeting.durationHours,
      availableStartTime: meeting.availableStartTime,
      availableEndTime: meeting.availableEndTime,
      responseDeadline: meeting.responseDeadline.toISOString(),
      confirmedStartAt: meeting.confirmedStartAt
        ? meeting.confirmedStartAt.toISOString()
        : null,
      confirmedEndAt: meeting.confirmedEndAt
        ? meeting.confirmedEndAt.toISOString()
        : null,
    };
  }

  async registerParticipant(
    inviteToken: string,
    body: RegisterParticipantRequest,
    authHeader?: string,
  ): Promise<ParticipantRegistered> {
    const guestName = body?.guestName?.trim();
    if (!guestName || guestName.length < 2 || guestName.length > 12) {
      throw new BadRequestException('닉네임은 2~12자여야 합니다.');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { inviteToken },
    });

    if (!meeting) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_INVALID,
        HttpStatus.NOT_FOUND,
        '유효하지 않은 초대 링크입니다.',
      );
    }

    if (
      meeting.inviteTokenExpiresAt &&
      meeting.inviteTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_EXPIRED,
        HttpStatus.GONE,
        '만료된 초대 링크입니다.',
      );
    }

    // 응답 수집 중(COLLECTING)일 때만 등록 가능. 그 외 상태는 마감 처리.
    if (meeting.status !== 'COLLECTING') {
      throw new DomainException(
        ErrorCode.RESPONSE_DEADLINE_PASSED,
        HttpStatus.GONE,
        '응답을 받을 수 있는 기간이 아닙니다.',
      );
    }

    // Bearer 가 있으면 로그인 사용자를 회원(MEMBER)으로 연동. 없으면 기존 비회원(GUEST).
    const userId = await resolveOptionalUserId(
      this.jwtService,
      this.prisma,
      authHeader,
    );

    if (userId !== null) {
      // 회원은 한 모임 1회 — 이미 참여했으면 기존 참여자를 그대로 반환(멱등).
      // 그러면 FE 가 응답 화면으로 보내 기존 응답을 보거나 변경할 수 있다.
      const existing = await this.prisma.participant.findUnique({
        where: { userId_meetingId: { userId, meetingId: meeting.id } },
      });
      if (existing) {
        return {
          participantId: existing.id,
          guestName: existing.guestName,
          participantEditToken: existing.editToken,
        };
      }

      try {
        const member = await this.prisma.participant.create({
          data: {
            meetingId: meeting.id,
            userId,
            guestName,
            participantType: 'MEMBER',
            // 회원은 JWT 로 응답을 식별하므로 edit_token 을 발급하지 않는다.
            editToken: null,
          },
        });
        return {
          participantId: member.id,
          guestName: member.guestName,
          participantEditToken: null,
        };
      } catch (e) {
        // 경합: findUnique 와 create 사이에 같은 회원이 먼저 등록되면 unique(P2002)
        // 위반 → 멱등 복구로 기존 참여자를 다시 조회해 반환(500 노출 방지).
        if (this.isUniqueViolation(e)) {
          const created = await this.prisma.participant.findUnique({
            where: { userId_meetingId: { userId, meetingId: meeting.id } },
          });
          if (created) {
            return {
              participantId: created.id,
              guestName: created.guestName,
              participantEditToken: created.editToken,
            };
          }
        }
        throw e;
      }
    }

    // 비회원 참여자는 기존 participantId + editToken 식별에 더해, 신규 등록부터는
    // 닉네임(정규화 기준 유일) + 참여 PIN 으로도 재접속할 수 있다(POST .../participants/session).
    // ADR: docs/decisions/0001-guest-participant-pin-reauth.md
    const pin = body?.pin;
    if (!pin || !PIN_PATTERN.test(pin)) {
      throw new BadRequestException('참여 PIN은 숫자 4자리여야 합니다.');
    }

    const normalizedGuestName = normalizeNickname(guestName);
    const duplicate = await this.prisma.participant.findFirst({
      where: { meetingId: meeting.id, normalizedGuestName },
      select: { id: true },
    });
    if (duplicate) {
      throw this.nicknameTaken();
    }

    const pinHash = await hash(pin, PIN_BCRYPT_ROUNDS);
    try {
      const participant = await this.prisma.participant.create({
        data: {
          meetingId: meeting.id,
          userId: null,
          guestName,
          normalizedGuestName,
          participantType: 'GUEST',
          editToken: randomUUID(),
          pinHash,
        },
      });

      return {
        participantId: participant.id,
        guestName: participant.guestName,
        participantEditToken: participant.editToken!,
      };
    } catch (e) {
      // 경합: 중복 확인과 create 사이에 같은 닉네임이 먼저 등록되면 unique(P2002) 위반.
      if (this.isUniqueViolation(e)) {
        throw this.nicknameTaken();
      }
      throw e;
    }
  }

  // POST /api/invites/:inviteToken/participants/session — 비회원 닉네임+PIN 재접속.
  // 신규 비회원(PIN 설정됨)만 대상 — 레거시 비회원(pinHash=null)은 기존 edit token 으로만 접근.
  // 브루트포스 방어: (1) 이 메서드의 실패 카운터+잠금(초대+닉네임 단위),
  // (2) 컨트롤러의 ParticipantSessionThrottlerGuard(IP 단위) — 둘 다 필수.
  async participantSession(
    inviteToken: string,
    body: ParticipantSessionRequest,
  ): Promise<ParticipantSessionResult> {
    const guestName = body?.guestName?.trim();
    const pin = body?.pin;
    if (!guestName || typeof pin !== 'string') {
      throw this.invalidParticipantCredentials();
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { inviteToken },
    });
    if (!meeting) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_INVALID,
        HttpStatus.NOT_FOUND,
        '유효하지 않은 초대 링크입니다.',
      );
    }
    if (
      meeting.inviteTokenExpiresAt &&
      meeting.inviteTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_EXPIRED,
        HttpStatus.GONE,
        '만료된 초대 링크입니다.',
      );
    }

    const normalizedGuestName = normalizeNickname(guestName);
    const participant = await this.prisma.participant.findFirst({
      where: { meetingId: meeting.id, normalizedGuestName },
    });

    // 존재하지 않거나 PIN 을 설정한 적 없는(레거시) 참여자 — 닉네임 존재 여부를 드러내지
    // 않도록 동일한 401 로 응답한다. 더미 해시로도 compare 를 수행해 타이밍을 맞춘다.
    if (!participant || !participant.pinHash) {
      await compare(pin, DUMMY_PIN_HASH);
      throw this.invalidParticipantCredentials();
    }

    if (
      participant.pinLockedUntil &&
      participant.pinLockedUntil.getTime() > Date.now()
    ) {
      throw this.participantLoginRateLimited();
    }

    const pinOk = await compare(pin, participant.pinHash);
    if (!pinOk) {
      // 두 번의 update 로 분리: 잠금 여부 판단에는 DB 가 원자적으로 증가시킨 결과값
      // (updated.pinFailedAttempts)이 필요하다 — 동시 요청 경합 시 update 이전에
      // 읽어둔 participant.pinFailedAttempts + 1 은 최신 값이 아닐 수 있기 때문이다.
      const updated = await this.prisma.participant.update({
        where: { id: participant.id },
        data: { pinFailedAttempts: { increment: 1 } },
        select: { pinFailedAttempts: true },
      });
      if (updated.pinFailedAttempts >= PIN_MAX_ATTEMPTS) {
        await this.prisma.participant.update({
          where: { id: participant.id },
          data: {
            pinLockedUntil: new Date(Date.now() + PIN_LOCK_DURATION_MS),
          },
        });
      }
      throw this.invalidParticipantCredentials();
    }

    // 성공 — 실패 카운터 초기화. editToken 은 회전시키지 않고 기존 값을 그대로 재사용한다
    // (매 로그인마다 다른 기기의 토큰을 무효화할 이유가 없다).
    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    });

    return {
      participantId: participant.id,
      guestName: participant.guestName,
      participantEditToken: participant.editToken!,
    };
  }

  private nicknameTaken(): DomainException {
    return new DomainException(
      ErrorCode.PARTICIPANT_NICKNAME_TAKEN,
      HttpStatus.CONFLICT,
      '이미 사용 중인 닉네임이에요.',
    );
  }

  // Prisma unique 제약 위반(P2002) 판별 — auth.service 의 동명 헬퍼와 같은 duck-typing.
  private isUniqueViolation(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: unknown }).code === 'P2002'
    );
  }

  private invalidParticipantCredentials(): DomainException {
    return new DomainException(
      ErrorCode.INVALID_PARTICIPANT_CREDENTIALS,
      HttpStatus.UNAUTHORIZED,
      '닉네임 또는 참여 PIN을 확인해 주세요.',
    );
  }

  private participantLoginRateLimited(): DomainException {
    return new DomainException(
      ErrorCode.PARTICIPANT_LOGIN_RATE_LIMITED,
      HttpStatus.TOO_MANY_REQUESTS,
      '잠시 후 다시 시도해 주세요.',
    );
  }
}
