export const normalizeCategories = (category: string | string[]) =>
  Array.isArray(category) ? category : [category];

export const estimateReadTime = (text: string) => {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = (text.match(/\b[\w']+\b/g) ?? []).length;
  const count = cjk + words;
  const minutes = Math.max(1, Math.ceil(count / 300));
  return `${minutes} 分钟`;
};

export const getDisplayDate = (
  pubDate: Date,
  displayDate: string | undefined,
  options: Intl.DateTimeFormatOptions
) => displayDate ?? pubDate.toLocaleDateString('zh-CN', options);
