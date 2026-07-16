export const getSiteUrl = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? // Vercel Production URL
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel for deployments
    'http://localhost:3000/';

  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`;
  
  // Strip trailing slash for consistency
  url = url.endsWith('/') ? url.slice(0, -1) : url;
  
  return url;
};
