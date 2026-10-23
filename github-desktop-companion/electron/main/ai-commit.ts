import { createHash } from 'node:crypto'

export const defaultAiInstruction = [
  '한국어 Conventional Commits 형식으로 작성해.',
  '실제 변경 내용만 정확하고 간결하게 요약해. 추측하거나 변경하지 않은 동작을 주장하지 마.',
  '제목은 type(scope): 요약 또는 type: 요약 형식의 한 줄로 작성해.',
  '본문에는 중요한 이유와 동작을 필요할 때만 적고, 불필요한 설명은 넣지 마.',
  '요청한 JSON 형식 이외의 내용은 출력하지 마.',
].join('\n')

export const defaultGeminiModel = 'gemini-flash-lite-latest'
export const maximumDiffBytes = 256 * 1024

export function hashCommitState(parts: string[]) {
  return createHash('sha256').update(parts.join('\0')).digest('hex')
}

export function parseCommitDraft(response: unknown) {
  const value = response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = value.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim()
  if (!text) throw new Error('Gemini 응답에 커밋 메시지가 없어.')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    throw new Error('Gemini가 제목과 본문을 JSON으로 반환하지 않았어. 다시 시도해줘.')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Gemini 응답 형식이 올바르지 않아.')
  const draft = parsed as { summary?: unknown; description?: unknown }
  const summary = typeof draft.summary === 'string' ? draft.summary.trim() : ''
  const description = typeof draft.description === 'string' ? draft.description.trim() : ''
  if (!summary || summary.length > 200 || /[\r\n]/.test(summary)) {
    throw new Error('Gemini가 유효한 한 줄 커밋 제목을 만들지 못했어.')
  }
  return { summary, description }
}

export async function requestGeminiModels(apiKey: string) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Gemini 모델 목록을 가져오지 못했어 (HTTP ${response.status}).`)
  const result = await response.json() as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
  }
  return (result.models ?? [])
    .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
    .map(model => model.name?.replace(/^models\//, ''))
    .filter((model): model is string => Boolean(model && /^(gemini|gemma)-/.test(model)))
    .sort((left, right) => left.localeCompare(right))
}

export async function requestCommitDraft(
  apiKey: string,
  model: string,
  instruction: string,
  repositoryName: string,
  branch: string,
  diff: string,
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: instruction }] },
        contents: [{ parts: [{ text: [
          '다음은 Git 커밋에 실제 포함될 staged diff야.',
          `저장소: ${repositoryName}`,
          `브랜치: ${branch}`,
          '제목은 summary, 본문은 description 키를 가진 JSON 객체로 반환해. description은 필요 없으면 빈 문자열로 둬.',
          '<git_diff>',
          diff,
          '</git_diff>',
        ].join('\n') }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1000,
          responseFormat: {
            text: {
              mimeType: 'APPLICATION_JSON',
              schema: {
                type: 'OBJECT',
                properties: {
                  summary: { type: 'STRING' },
                  description: { type: 'STRING' },
                },
                required: ['summary', 'description'],
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  )
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(detail.error?.message
      ? `Gemini 요청 실패: ${detail.error.message}`
      : `Gemini 요청 실패 (HTTP ${response.status}).`)
  }
  return parseCommitDraft(await response.json())
}
