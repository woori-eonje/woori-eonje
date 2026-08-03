import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

// 비밀번호 재설정 메일 발송 전용 얇은 래퍼.
// RESEND_API_KEY 미설정 시 부팅 실패(다른 필수 환경변수와 동일한 정책).
@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    this.resend = new Resend(apiKey);
    this.from = process.env.MAIL_FROM ?? 'noreply@woori-eonje.app';
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: '[우리 언제?] 비밀번호 재설정',
      html: `<p>아래 링크를 눌러 비밀번호를 재설정하세요. 이 링크는 30분간 유효하며 한 번만 사용할 수 있습니다.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
    // resend SDK는 API 레벨 실패(잘못된 수신자, API 키 문제, rate limit 등) 시에도
    // reject하지 않고 { data: null, error } 로 resolve하므로 직접 예외로 전환해야 한다.
    if (error) {
      throw new Error(`비밀번호 재설정 메일 발송 실패: ${error.message}`);
    }
  }
}
