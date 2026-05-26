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

/** 搭配评分：对一套搭配进行多维度评分（1-10） */
export async function rateOutfit(params: {
  items: Array<{ name: string; category: string; color?: string; colors?: string[] }>;
  occasion?: string;
}): Promise<{
  overall: number;
  colorHarmony: number;
  styleConsistency: number;
  occasionMatch: number;
  suggestions: string;
}> {
  const itemList = params.items
    .map(i => {
      const colorStr = i.colors ? i.colors.join('/') : (i.color || '');
      return `- ${i.name} (${i.category}${colorStr ? ', ' + colorStr : ''})`;
    })
    .join('\n');

  const systemPrompt = `你是一位专业的服装搭配评审师。根据用户提供的搭配，进行多维度评分。
你必须用 JSON 格式回复，格式为: {"overall": 8, "colorHarmony": 7, "styleConsistency": 9, "occasionMatch": 6, "suggestions": "改进建议（80字以内）"}
overall/colorHarmony/styleConsistency/occasionMatch 均为 1-10 的整数。
只返回 JSON，不要包含其他文字。`;

  const userPrompt = [
    '请为以下搭配评分：',
    params.occasion ? `场合: ${params.occasion}` : '',
    '',
    '搭配内容：',
    itemList,
  ].filter(Boolean).join('\n');

  const text = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 400 }
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('搭配评分解析失败');
  }
  return JSON.parse(jsonMatch[0]);
}

/** 智能分类：根据衣物名称和描述自动识别分类、颜色、风格、季节 */
export async function categorizeClothing(params: {
  name: string;
  description?: string;
}): Promise<{
  category: string;
  colors: string[];
  styles: string[];
  seasons: string[];
}> {
  const systemPrompt = `你是一位专业的服装分类师。根据衣物名称和描述，给出分类建议。
你必须用 JSON 格式回复，格式为: {"category": "top", "colors": ["白色", "黑色"], "styles": ["休闲", "简约"], "seasons": ["春", "秋"]}
category 必须是以下之一: top(上装), bottom(下装), dress(连衣裙), outerwear(外套), shoes(鞋子), accessory(配饰)
colors 是颜色数组，styles 是风格标签数组，seasons 是季节数组(春/夏/秋/冬)。
只返回 JSON，不要包含其他文字。`;

  const userPrompt = [
    '请为以下衣物分类：',
    `名称: ${params.name}`,
    params.description ? `描述: ${params.description}` : '',
  ].filter(Boolean).join('\n');

  const text = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 400 }
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('衣物分类解析失败');
  }
  return JSON.parse(jsonMatch[0]);
}

/** 虚拟试穿：基于衣物列表和用户信息生成试穿效果描述（为未来通义万相图片生成预留接口） */
export async function virtualTryOn(params: {
  clothingUrls: string[];
  clothingNames: Array<{ name: string; category: string; colors?: string[] }>;
  userInfo?: { gender?: string; height?: string; bodyType?: string };
}): Promise<{
  outfitDescription: string;
  fitAnalysis: string;
  styleAdvice: string;
}> {
  const clothingList = params.clothingNames
    .map((c, i) => {
      const colorStr = c.colors ? c.colors.join('/') : '';
      return `${i + 1}. ${c.name} (${c.category}${colorStr ? ', ' + colorStr : ''})`;
    })
    .join('\n');

  const userDesc = params.userInfo
    ? [
        params.userInfo.gender ? `性别: ${params.userInfo.gender}` : '',
        params.userInfo.height ? `身高: ${params.userInfo.height}` : '',
        params.userInfo.bodyType ? `体型: ${params.userInfo.bodyType}` : '',
      ].filter(Boolean).join(', ')
    : '';

  const systemPrompt = `你是一位专业的虚拟试穿顾问。根据用户提供的衣物搭配和身材信息，模拟试穿效果并给出分析。
你必须用 JSON 格式回复，格式为: {"outfitDescription": "整体穿搭效果描述（100字以内）", "fitAnalysis": "合身度分析（80字以内）", "styleAdvice": "风格建议（80字以内）"}
只返回 JSON，不要包含其他文字。`;

  const userPrompt = [
    '请分析以下衣物的虚拟试穿效果：',
    '',
    clothingList,
    userDesc ? `\n用户信息: ${userDesc}` : '',
    '',
    '请描述整体穿搭效果、合身度分析，并给出风格建议。',
  ].filter(Boolean).join('\n');

  const text = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 600 }
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('虚拟试穿分析解析失败');
  }
  return JSON.parse(jsonMatch[0]);
}
