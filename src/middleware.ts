import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  const url = new URL(context.request.url);

  console.log(
    `[server] ${context.request.method} ${url.pathname} ${response.status} ${duration}ms`
  );

  return response;
});
