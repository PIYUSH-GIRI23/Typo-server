import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

export function getDeviceInfo(req) {
  const ip = getIpAddress(req);

  const geo = geoip.lookup(ip) || {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    timezone: 'Unknown'
  };

  const userAgentStr = req.headers['user-agent'] || req.headers['User-Agent'] || '';
  const parsedUa = UAParser(userAgentStr);
  const browser = parsedUa.browser || {};
  const os = parsedUa.os || {};
  const device = parsedUa.device || {};

  return {
    ip,
    location: {
      country: geo.country || 'Unknown',
      region: geo.region || 'Unknown',
      city: geo.city || 'Unknown',
      timezone: geo.timezone || 'Unknown'
    },
    browser: {
      name: browser.name || 'Unknown',
      version: browser.version || 'Unknown'
    },
    os: {
      name: os.name || 'Unknown',
      version: os.version || 'Unknown'
    },
    device: {
      type: device.type || 'Unknown',
      vendor: device.vendor || 'Unknown',
      model: device.model || 'Unknown'
    },
    userAgent: userAgentStr || 'Unknown'
  };
}

function getIpAddress(req) {
  const rawIp =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-vercel-forwarded-for'] ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress;

  if (!rawIp) return 'Unknown';

  let cleanedIp = rawIp.split(',')[0].trim();

  if (cleanedIp.startsWith('::ffff:')) {
    cleanedIp = cleanedIp.replace('::ffff:', '');
  }

  return cleanedIp;
}

export default getDeviceInfo;
