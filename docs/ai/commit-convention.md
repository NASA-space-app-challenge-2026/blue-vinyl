# Commit Convention

이 저장소의 모든 커밋 메시지는 아래 형식을 따른다. 로컬 `commit-msg` hook(`.githooks/commit-msg`)이 커밋 시점에 검사한다.

## 형식

```
<prefix>: <description>.
```

- `prefix`는 아래 4개 중 하나만 허용되며, 반드시 소문자로 쓴다.
  - `feat` — 새 기능 추가
  - `fix` — 버그 수정
  - `chore` — 빌드/설정/스크립트/의존성 등 잡무
  - `docs` — 문서 변경
- 콜론(`:`) 바로 뒤에 공백 한 칸을 둔다.
- 설명은 공백으로 시작하지 않는다.
- 제목은 마침표(`.`)로 끝난다.
- 검사는 첫 줄(제목)에만 적용된다.

## 예시

허용:

```
feat: add new feature.
chore: add something.
fix: fix the bug.
docs: update commit convention.
```

거부:

```
Feat: add new feature.     # 대문자 prefix
feat:add new feature.      # 콜론 뒤 공백 없음
feat: add new feature      # 마침표 없음
refactor: clean up code.   # 허용되지 않은 prefix
```

## Hook 설정

저장소를 clone한 뒤 한 번 실행한다.

```sh
git config core.hooksPath .githooks
```
