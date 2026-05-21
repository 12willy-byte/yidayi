/// 阿里云百炼大模型 API 客户端
/// 文档: https://help.aliyun.com/document_detail/2712195.html

const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-plus';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

let cachedApiKey: string | null = null;

function getApiKey(): string {
  if (cachedApiKey) return cachedApiKey;
  cachedApiKey = process.env.BAILIAN_API_KEY || '';
  return cachedApiKey;
}

/** 清除缓存的 key（用于运行时切换） */
export function setBailianApiKey(key: string): void {
  cachedApiKey = key;
}

/** 调用百炼大模型（OpenAI 兼容 chat completions） */
export async function chatCompletion(
  messages: ChatMessage[],
  options: LLMCallOptions = {}
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('BAILIAN_API_KEY 未配置，请在 server/.env 中设置');
  }

  const body = JSON.stringify({
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 500,
  });

  const response = await fetch(`${BAILIAN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`百炼 API 调用失败 (${response.status}): ${err}`);
  }

  const data = await response.json() as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('百炼 API 返回格式异常');
  }
  return content.trim();
}

/** 搭配建议：根据用户衣橱和场景生成搭配方案 */
export async function suggestOutfit(params: {
  wardrobeItems: Array<{ name: string; category: string; colors: string[] }>;
  occasion?: string;
  weather?: string;
  stylePreference?: string;
}): Promise<{ outfitName: string; items: string[]; reason: string }> {
  const itemList = params.wardrobeItems
    .map(i => `- ${i.name} (${i.category}, ${i.colors.join('/')})`)
    .join('\n');

  const systemPrompt = `你是一位专业的服装搭配师。根据用户的衣橱物品列表，为其推荐一套搭配。
你必须用 JSON 格式回复，格式为: {"outfitName": "搭配名称", "items": ["物品名称1", "物品名称2"], "reason": "推荐理由（50字以内）"}
只返回 JSON，不要包含其他文字。`;

  const userPrompt = [
    '请为我搭配一套衣服：',
    params.occasion ? `场合: ${params.occasion}` : '',
    params.weather ? `天气: ${params.weather}` : '',
    params.stylePreference ? `风格偏好: ${params.stylePreference}` : '',
    '',
    '我的衣橱：',
    itemList,
  ].filter(Boolean).join('\n');

  const text = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.8, maxTokens: 400 }
  );

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('搭配建议解析失败');
  }
  return JSON.parse(jsonMatch[0]);
}
