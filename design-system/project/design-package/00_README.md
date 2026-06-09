# 우리 언제? 최종 디자인 패키지

이 패키지는 `우리 언제?` 서비스의 디자인 작업과 Claude Design 화면 제작 요청에 필요한 자료를 종합한 파일입니다.

## 폴더 구성

```txt
01_project/
- meetboard_project_plan.md

02_design_system/
- woori-eonje-design-system.md
- woori-eonje-design-system.docx

03_screen_design_brief/
- woori-eonje-screen-design-brief-v2.md
- woori-eonje-screen-design-brief-final.md

04_assets/
- logo.svg
- favicon.svg

05_reference_images/
- 디자인 무드보드, 로고/파비콘 비교, 브랜드 가이드 참고 이미지
```

## 사용 순서

1. `02_design_system/woori-eonje-design-system.docx` 또는 `.md`로 전체 디자인 시스템 확인
2. `03_screen_design_brief/woori-eonje-screen-design-brief-final.md`를 Claude Design에 전달
3. 1차 핵심 화면부터 제작 요청
   - 모바일 시간 선택 화면
   - 추천 결과 화면
   - 모임 생성 Wizard
   - 초대 참여 화면
4. 결과물을 평가 체크리스트 기준으로 검토
5. 선택한 방향을 기준으로 랜딩, 내 모임 목록, 최종 요약, 로그인 화면까지 확장

## 핵심 디자인 방향

```txt
Cool Playful Utility
Clean Pop, Limited Color
Fresh Pastel Scheduling
```

- 쿨톤 화이트/라이트그레이 기반
- Forest Green을 주요 액션 컬러로 사용
- Poppy는 로고 물음표, 파비콘, 작은 포인트에만 제한
- 말풍선, 물음표, 시간 슬롯, 둥근 도형으로 서비스 고유의 리듬감 표현
- 일반적인 AI SaaS 랜딩처럼 보이는 3D 오브젝트, 과한 그라데이션, 가짜 대시보드 목업은 지양
