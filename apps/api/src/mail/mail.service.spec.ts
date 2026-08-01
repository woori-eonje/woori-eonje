import { MailService } from './mail.service';

describe('MailService.sendPasswordResetEmail', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.MAIL_FROM;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.MAIL_FROM = 'noreply@woori-eonje.app';
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.MAIL_FROM = originalFrom;
  });

  it('Resend 클라이언트에 발신자·수신자·재설정 링크를 담아 전달한다', async () => {
    const service = new MailService();
    const send = jest.fn().mockResolvedValue({ data: { id: 'email_1' } });
    (
      service as unknown as { resend: { emails: { send: typeof send } } }
    ).resend = { emails: { send } };

    await service.sendPasswordResetEmail(
      'user@example.com',
      'https://woori-eonje.app/reset-password?token=abc',
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@woori-eonje.app',
        to: 'user@example.com',
        subject: expect.stringContaining('비밀번호'),
        html: expect.stringContaining(
          'https://woori-eonje.app/reset-password?token=abc',
        ),
      }),
    );
  });

  it('RESEND_API_KEY 가 없으면 생성 시 예외를 던진다', () => {
    delete process.env.RESEND_API_KEY;
    expect(() => new MailService()).toThrow('RESEND_API_KEY');
  });
});
