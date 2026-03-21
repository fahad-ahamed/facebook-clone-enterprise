/**
 * Device Tracking Service
 * Tracks user devices for security and session management
 */

export interface Device {
  id: string;
  userId: string;
  fingerprint: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'bot' | 'unknown';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  firstSeen: Date;
  lastSeen: Date;
  isActive: boolean;
  isTrusted: boolean;
  isSuspicious: boolean;
  loginCount: number;
  userAgent: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  canvas?: string;
  webgl?: string;
  fonts?: string[];
}

export class DeviceTrackingService {
  private devices: Map<string, Device> = new Map();
  private userDevices: Map<string, Set<string>> = new Map();

  /**
   * Register or update device
   */
  async registerDevice(
    userId: string,
    data: {
      userAgent: string;
      ipAddress: string;
      fingerprint?: DeviceFingerprint;
    }
  ): Promise<Device> {
    const parsedUA = this.parseUserAgent(data.userAgent);
    const fingerprint = this.generateFingerprint(data.fingerprint || { userAgent: data.userAgent });
    
    // Check if device already exists
    const existingDevice = await this.findDeviceByFingerprint(userId, fingerprint);
    
    if (existingDevice) {
      // Update existing device
      existingDevice.lastSeen = new Date();
      existingDevice.ipAddress = data.ipAddress;
      existingDevice.loginCount++;
      this.devices.set(existingDevice.id, existingDevice);
      return existingDevice;
    }

    // Create new device
    const device: Device = {
      id: this.generateDeviceId(),
      userId,
      fingerprint,
      name: `${parsedUA.browser} on ${parsedUA.os}`,
      type: this.detectDeviceType(parsedUA),
      browser: parsedUA.browser,
      browserVersion: parsedUA.browserVersion,
      os: parsedUA.os,
      osVersion: parsedUA.osVersion,
      ipAddress: data.ipAddress,
      firstSeen: new Date(),
      lastSeen: new Date(),
      isActive: true,
      isTrusted: false,
      isSuspicious: false,
      loginCount: 1,
      userAgent: data.userAgent,
    };

    this.devices.set(device.id, device);
    
    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Set());
    }
    this.userDevices.get(userId)!.add(device.id);

    return device;
  }

  /**
   * Get all devices for user
   */
  async getUserDevices(userId: string): Promise<Device[]> {
    const deviceIds = this.userDevices.get(userId) || new Set();
    const devices: Device[] = [];

    for (const deviceId of deviceIds) {
      const device = this.devices.get(deviceId);
      if (device) {
        devices.push(device);
      }
    }

    return devices.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<Device | null> {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Trust a device
   */
  async trustDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isTrusted = true;
      device.isSuspicious = false;
      this.devices.set(deviceId, device);
    }
  }

  /**
   * Remove device
   */
  async removeDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      const userDeviceIds = this.userDevices.get(device.userId);
      if (userDeviceIds) {
        userDeviceIds.delete(deviceId);
      }
    }
  }

  /**
   * Mark device as suspicious
   */
  async markSuspicious(deviceId: string, reason: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isSuspicious = true;
      device.isTrusted = false;
      this.devices.set(deviceId, device);
      // Log security event
      console.log(`[Security] Device ${deviceId} marked suspicious: ${reason}`);
    }
  }

  /**
   * Check for suspicious activity
   */
  async checkSuspiciousActivity(
    userId: string,
    data: { ipAddress: string; userAgent: string; fingerprint?: DeviceFingerprint }
  ): Promise<{ isSuspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    const devices = await this.getUserDevices(userId);
    const fingerprint = this.generateFingerprint(data.fingerprint || { userAgent: data.userAgent });

    // Check for new device
    const knownDevice = devices.find(d => d.fingerprint === fingerprint);
    if (!knownDevice && devices.length > 0) {
      reasons.push('New device detected');
    }

    // Check for unusual location
    const locations = devices
      .filter(d => d.location?.country)
      .map(d => d.location!.country);
    const uniqueCountries = new Set(locations);
    if (uniqueCountries.size > 3) {
      reasons.push('Access from multiple countries');
    }

    // Check for rapid device additions
    const recentDevices = devices.filter(
      d => d.firstSeen > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    if (recentDevices.length > 3) {
      reasons.push('Multiple new devices in 24 hours');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Get device count for user
   */
  async getDeviceCount(userId: string): Promise<number> {
    return (this.userDevices.get(userId) || new Set()).size;
  }

  // Private methods
  private generateDeviceId(): string {
    return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(data: DeviceFingerprint): string {
    const parts = [
      data.userAgent,
      data.screenResolution || '',
      data.timezone || '',
      data.language || '',
      data.platform || '',
    ];
    return this.hashString(parts.join('|'));
  }

  private hashString(str: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 32);
  }

  private findDeviceByFingerprint(userId: string, fingerprint: string): Promise<Device | null> {
    const deviceIds = this.userDevices.get(userId) || new Set();
    for (const deviceId of deviceIds) {
      const device = this.devices.get(deviceId);
      if (device && device.fingerprint === fingerprint) {
        return Promise.resolve(device);
      }
    }
    return Promise.resolve(null);
  }

  private parseUserAgent(userAgent: string): {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
  } {
    // Simple UA parsing (in production, use a proper UA parser)
    let browser = 'Unknown';
    let browserVersion = '';
    let os = 'Unknown';
    let osVersion = '';

    // Browser detection
    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      const match = userAgent.match(/Edge\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    }

    // OS detection
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return { browser, browserVersion, os, osVersion };
  }

  private detectDeviceType(parsedUA: { browser: string; os: string }): Device['type'] {
    const os = parsedUA.os.toLowerCase();
    if (os.includes('android') || os.includes('ios') || os.includes('iphone')) {
      return 'mobile';
    }
    if (os.includes('ipad')) {
      return 'tablet';
    }
    if (os.includes('windows') || os.includes('macos') || os.includes('linux')) {
      return 'desktop';
    }
    return 'unknown';
  }
}

export const deviceTrackingService = new DeviceTrackingService();
