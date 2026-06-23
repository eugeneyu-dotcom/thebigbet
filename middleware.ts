export const config = {
  matcher: '/',
};

export default function middleware(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || '';

  let lang = 'en';
  if (country === 'TW') lang = 'zh-tw';
  else if (country === 'TH') lang = 'th';

  const url = new URL(request.url);
  url.pathname = `/${lang}/`;

  return Response.redirect(url, 307);
}
