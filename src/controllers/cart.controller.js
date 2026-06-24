import prisma from '../prisma/client.js';
import { sendResponse } from '../utils/response.js';

export const getCart = async (req, res) => {
  if (req.user.roleName !== 'BUYER') return sendResponse(res, 403, false, 'Only buyers have carts');

  // get buyer from user id
  const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } }); // assuming email matches
  if (!buyer) return sendResponse(res, 404, false, 'Buyer profile not found for user');

  let cart = await prisma.cart.findUnique({
    where: { buyerId: buyer.id },
    include: {
      items: {
        include: { design: true }
      },
      buyer: {
        include: {
          firm: {
            include: {
              company: true
            }
          }
        }
      }
    }
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { buyerId: buyer.id },
      include: { 
        items: { include: { design: true } },
        buyer: { include: { firm: { include: { company: true } } } }
      }
    });
  }

  // calculate subtotal
  let subtotal = 0;
  cart.items.forEach(item => {
    subtotal += item.quantity * item.design.rate;
  });

  return sendResponse(res, 200, true, 'Cart retrieved', { cart, subtotal });
};

export const addToCart = async (req, res) => {
  const { designId, quantity, color } = req.body;
  const buyer = await prisma.buyer.findFirst({ where: { email: req.user.email } });
  if (!buyer) return sendResponse(res, 404, false, 'Buyer not found');

  let cart = await prisma.cart.findUnique({ where: { buyerId: buyer.id } });
  if (!cart) cart = await prisma.cart.create({ data: { buyerId: buyer.id } });

  // Check if item exists
  const existingItem = await prisma.cartitem.findFirst({
    where: { cartId: cart.id, designId: parseInt(designId), color: color || null }
  });

  if (existingItem) {
    const updated = await prisma.cartitem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + parseInt(quantity) }
    });
    return sendResponse(res, 200, true, 'Cart item updated', updated);
  } else {
    const newItem = await prisma.cartitem.create({
      data: { cartId: cart.id, designId: parseInt(designId), quantity: parseInt(quantity), color: color || null }
    });
    return sendResponse(res, 201, true, 'Added to cart', newItem);
  }
};

export const updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const cartItemId = parseInt(req.params.itemId);

  const updated = await prisma.cartitem.update({
    where: { id: cartItemId },
    data: { quantity: parseInt(quantity) }
  });
  return sendResponse(res, 200, true, 'Cart item updated', updated);
};

export const removeCartItem = async (req, res) => {
  const cartItemId = parseInt(req.params.itemId);
  await prisma.cartitem.delete({ where: { id: cartItemId } });
  return sendResponse(res, 200, true, 'Item removed');
};
