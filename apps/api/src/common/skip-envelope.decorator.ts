import { SetMetadata } from '@nestjs/common';

// 이 데코레이터가 붙은 핸들러는 ResponseInterceptor 의 공통 봉투({success,data,error})를
// 건너뛰고 반환값을 그대로 응답한다(예: text/calendar raw 텍스트). 성공 응답에만 영향.
export const SKIP_ENVELOPE = 'skipEnvelope';
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE, true);
