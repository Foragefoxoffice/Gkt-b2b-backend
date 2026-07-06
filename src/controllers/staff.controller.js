import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const getStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: {
          name: {
            not: 'BUYER'
          }
        },
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    return sendResponse(res, 200, true, 'Staff fetched successfully', staff.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      roleId: user.roleId,
      createdAt: user.createdAt
    })));
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const createStaff = async (req, res) => {
  try {
    const { name, email, phone, roleId, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return sendResponse(res, 400, false, 'Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password || '123456', 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        roleId: parseInt(roleId)
      },
      include: {
        role: true
      }
    });

    return sendResponse(res, 201, true, 'Staff created successfully', {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role.name,
      roleId: newUser.roleId
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, roleId, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return sendResponse(res, 404, false, 'Staff not found');
    }

    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return sendResponse(res, 400, false, 'Email already exists');
      }
    }

    const updateData = { name, email, phone };
    if (roleId) updateData.roleId = parseInt(roleId);
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { role: true }
    });

    return sendResponse(res, 200, true, 'Staff updated successfully', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role.name,
      roleId: updatedUser.roleId
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return sendResponse(res, 400, false, 'You cannot delete yourself');
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    return sendResponse(res, 200, true, 'Staff deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: {
        name: {
          not: 'BUYER'
        }
      }
    });

    return sendResponse(res, 200, true, 'Roles fetched successfully', roles);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
