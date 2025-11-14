const { query } = require('../config/database');

// Créer une nouvelle commande
const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      delivery_method,
      payment_method,
      items
    } = req.body;

    // Validation
    if (!customer_name || !customer_phone || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants: customer_name, customer_phone, items'
      });
    }

    // Calculer le subtotal et total
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.product_price;
    }

    const delivery_fee = delivery_method === 'delivery' ? 1000 : 0;
    const total_amount = subtotal + delivery_fee;

    // Créer la commande
    const orderResult = await query(`
      INSERT INTO orders (
        user_id, customer_name, customer_email, customer_phone,
        delivery_address, delivery_method, payment_method,
        payment_status, subtotal, delivery_fee, total_amount, order_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      user_id || null,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      delivery_method || 'pickup',
      payment_method || 'cash',
      'pending',
      subtotal,
      delivery_fee,
      total_amount,
      'pending'
    ]);

    const order = orderResult.rows[0];

    // Créer les lignes de commande (order_items)
    for (const item of items) {
      const itemSubtotal = item.quantity * item.product_price;
      
      await query(`
        INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [order.id, item.product_id, item.product_name, item.product_price, item.quantity, itemSubtotal]);

      // Décrémenter le stock du produit
      await query(`
        UPDATE products 
        SET stock_quantity = stock_quantity - $1,
            sales_count = sales_count + $2
        WHERE id = $3
      `, [item.quantity, item.quantity, item.product_id]);
    }

    // Récupérer la commande complète avec les items
    const fullOrderResult = await query(`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_price', oi.product_price,
            'quantity', oi.quantity,
            'subtotal', oi.subtotal
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `, [order.id]);

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: fullOrderResult.rows[0]
    });

  } catch (error) {
    console.error('Erreur createOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande',
      error: error.message
    });
  }
};

// Récupérer toutes les commandes (avec filtres)
const getAllOrders = async (req, res) => {
  try {
    const { status, user_id } = req.query;

    let sql = `
      SELECT 
        o.*,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      sql += ` AND o.order_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (user_id) {
      sql += ` AND o.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Erreur getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message
    });
  }
};

// Récupérer une commande par son ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_price', oi.product_price,
            'quantity', oi.quantity,
            'subtotal', oi.subtotal
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur getOrderById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la commande',
      error: error.message
    });
  }
};

// Mettre à jour le statut d'une commande
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Le statut est obligatoire'
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}`
      });
    }

    const result = await query(`
      UPDATE orders
      SET order_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Statut de la commande mis à jour',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
};

// Annuler une commande
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la commande existe et n'est pas déjà livrée
    const orderCheck = await query('SELECT * FROM orders WHERE id = $1', [id]);

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const order = orderCheck.rows[0];

    if (order.order_status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler une commande déjà livrée'
      });
    }

    if (order.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cette commande est déjà annulée'
      });
    }

    // Restaurer le stock des produits
    const items = await query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    
    for (const item of items.rows) {
      await query(`
        UPDATE products 
        SET stock_quantity = stock_quantity + $1,
            sales_count = sales_count - $2
        WHERE id = $3
      `, [item.quantity, item.quantity, item.product_id]);
    }

    // Mettre à jour le statut
    const result = await query(`
      UPDATE orders
      SET order_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json({
      success: true,
      message: 'Commande annulée avec succès',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur cancelOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la commande',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
};