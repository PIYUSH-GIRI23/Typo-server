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

  const ua = new UAParser(req.headers['user-agent']);
  const browser = ua.getBrowser();
  const os = ua.getOS();
  const device = ua.getDevice();

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
    userAgent: req.headers['user-agent'] || 'Unknown'
  };
}

function getIpAddress(req) {
  const ip =
    req.headers['x-vercel-forwarded-for'] ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress;

  const cleanedIp = ip ? ip.split(',')[0].trim() : 'Unknown';

  return cleanedIp.replace(/^.*:/, '');
}

export default getDeviceInfo;
