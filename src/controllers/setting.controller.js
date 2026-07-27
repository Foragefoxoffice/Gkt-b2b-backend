import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const getSettings = async (req, res) => {
  try {
    const settingsRaw = await prisma.$queryRaw`SELECT * FROM setting`;
    
    // Convert array of settings to a key-value object
    const settings = {};
    if (Array.isArray(settingsRaw)) {
      settingsRaw.forEach(setting => {
        settings[setting.key] = setting.value;
      });
    }

    return sendResponse(res, 200, true, 'Settings retrieved successfully', settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return sendResponse(res, 500, false, 'Failed to fetch settings');
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!key || value === undefined) {
      return sendResponse(res, 400, false, 'Key and value are required');
    }

    const valueStr = String(value);

    // Use raw query for upsert to avoid requiring prisma client generation
    await prisma.$executeRaw`
      INSERT INTO setting (\`key\`, \`value\`, \`createdAt\`, \`updatedAt\`) 
      VALUES (${key}, ${valueStr}, NOW(), NOW()) 
      ON DUPLICATE KEY UPDATE \`value\` = ${valueStr}, \`updatedAt\` = NOW()
    `;

    return sendResponse(res, 200, true, 'Setting updated successfully', { key, value: valueStr });
  } catch (error) {
    console.error('Error updating setting:', error);
    return sendResponse(res, 500, false, 'Failed to update setting');
  }
};
