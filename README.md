# 돌이전쟁 — 최종판

12×12 변형 전쟁 체스의 반응형 웹 대국판입니다.

## 포함 기능

- 모든 기본 기물의 이동 및 공격 범위 계산
- 미니 돌이, 대포, 창 돌이, 기마병, 궁수의 특수 행마/공격
- 의사 회복 및 물약 구조
- 수호자 보호·무적·피해 전가
- 돌이 도로늄 게이지별 행마/공격과 지속 디버프
- 미사일 4턴 예약 낙하, 공개, 쿨타임 구조
- 피해 감소, 무적, 밀치기, 자동 이동, 왕 처치 승리
- 전투 로그, 실행 취소/다시 실행, 승리 팝업
- 데스크톱·태블릿·모바일 자동 반응형 UI

## 실행

`index.html`을 브라우저에서 열면 됩니다.


## 최적화/온라인 대전판 업데이트

- 144개 보드 칸 DOM을 최초 1회 생성하고 이후에는 상태만 갱신하는 증분 렌더링 구조
- 기물/보드 O(1) 인덱스와 합법수 캐시로 반복적인 `find/filter` 비용 감소
- 드래그/클릭 모두 보드 위에 합법 이동(초록), 공격(빨강), 능력 대상(금색)을 직접 표시
- Pointer Events + pointer capture 기반으로 마우스/터치 입력 통합
- FLIP/Web Animations API 기반 기물 이동 애니메이션
- 전투 로그 DOM 누적/재생성 최소화
- PeerJS WebRTC 기반 실시간 온라인 대전: 방 만들기/방 참가, 호스트 권한 검증, 상태 동기화
- 로컬 ELO 레이팅 표시 및 경기 종료 시 레이팅 계산
- 기존 `test-engine.mjs` 전체 규칙 테스트 통과

> 온라인 대전은 별도 게임 서버 없이 브라우저 간 WebRTC 연결을 사용합니다. PeerJS CDN에 접속할 수 있어야 하며, GitHub Pages 같은 HTTPS 환경에서 사용하는 것을 권장합니다.


## Performance / animation architecture

- The board is a persistent 12×12 DOM grid; renders never recreate 144 cells.
- Rendering is coalesced through a single `requestAnimationFrame`, so repeated state changes produce at most one visual commit per frame.
- No `getBoundingClientRect()` scan or Web Animation is performed from the render loop.
- A committed move animates the real destination piece with the Web Animations API. No temporary action clone is created, and the destination cell is never hidden behind a second piece. Dragging also uses the real piece DOM, so there is no drag-ghost element.
- AI calculation runs in `src/ai-worker.js` as a module Web Worker and cannot block the main UI thread.
- Expensive panel blur/paint effects were removed from the critical path.
- Existing engine rule tests remain the compatibility gate.
