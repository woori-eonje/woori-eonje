import { normalizeNickname } from './nickname';

describe('normalizeNickname', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeNickname('  민수  ')).toBe('민수');
  });

  it('연속 공백을 하나로 축소한다', () => {
    expect(normalizeNickname('민수   철수')).toBe('민수 철수');
  });

  it('영문을 소문자로 변환한다', () => {
    expect(normalizeNickname('MinSu')).toBe('minsu');
  });

  it('공백·대소문자 차이만 있는 닉네임은 같은 값으로 정규화된다', () => {
    expect(normalizeNickname('  MinSu  ')).toBe(normalizeNickname('minsu'));
  });
});
