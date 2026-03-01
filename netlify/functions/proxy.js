// netlify/functions/proxy.js
// CORS Proxy für iCloud Kalender
// Wird automatisch unter /.netlify/functions/proxy erreichbar

exports.handler = async function(event, context) {
  const url = event.queryStringParameters && event.queryStringParameters.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing url parameter' })
    };
  }

  // Only allow iCloud / calendar URLs for security
  const allowed = [
    'p-caldav.icloud.com',
    'p01-caldav.icloud.com',
    'p02-caldav.icloud.com',
    'p03-caldav.icloud.com',
    'p04-caldav.icloud.com',
    'p05-caldav.icloud.com',
    'p06-caldav.icloud.com',
    'p07-caldav.icloud.com',
    'p08-caldav.icloud.com',
    'p09-caldav.icloud.com',
    'p10-caldav.icloud.com',
    'ical.icloud.com',
    'www.icloud.com',
    'caldav.icloud.com',
  ];

  const parsedUrl = new URL(url.replace(/^webcal:\/\//i, 'https://'));
  const isAllowed = allowed.some(domain => parsedUrl.hostname.includes(domain) || parsedUrl.hostname.endsWith('.icloud.com'));

  if (!isAllowed) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Only iCloud URLs are allowed' })
    };
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 LernPlaner/1.0',
        'Accept': 'text/calendar, application/calendar+json, */*',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `iCloud returned ${response.status}` })
      };
    }

    const text = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, max-age=0',
      },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
