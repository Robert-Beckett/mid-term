/*
 * All routes for Restaurants are defined here
 * Since this file is loaded in server.js into api/restaurants,
 *   these routes are mounted onto /restaurants
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

const express = require('express');
const router  = express.Router();
const path = require('path');
const moment = require('moment');



module.exports = (db, twilio) => {
  console.log('TESTING MOMENT');

  const getUserNumber = (order_id) => {
    return db.query(`
    SELECT phone_number
    FROM users
      JOIN orders ON customer_id = users.id
    WHERE orders.id = $1;
    `, [order_id])
      .then((query) => {
        return query.rows[0];
      });
  };

  router.get("/test", (req, res) => {
    res.sendFile(path.resolve('./views/restaurant/test.html'));
  });

  router.get("/", (req, res) => {

    res.sendFile(path.resolve('./views/restaurant/restaurant.html'));
  }),

  router.get("/orders", (req, res) => {

    return db.query(`
    SELECT orders.id AS id,
      CONCAT(users.first_name, ' ',
          INITCAP(LEFT(users.last_name, 1))) AS customer,
       users.phone_number, orders.id,
       items.name AS order_item, items.cost AS item_cost,
       time_placed, time_confirmed, time_complete
    FROM restaurants
      JOIN orders ON (restaurant_id = restaurants.id)
      JOIN users ON (customer_id = users.id)
      JOIN order_items ON (order_id = orders.id)
      JOIN items ON (item_id = items.id);
    `, [])
      .then(query => {
        const data = query.rows;
        const uniqueOrders = {};
        const formattedOutput = [];

        for (const order of data) {
          if (!uniqueOrders.hasOwnProperty(order.id)) {
            uniqueOrders[order.id] = order;
            uniqueOrders[order.id].items = [{
              name: order.order_item,
              cost: order.item_cost
            }];
            delete uniqueOrders[order.id].order_item;
            delete uniqueOrders[order.id].item_cost;
          } else {
            uniqueOrders[order.id].items.push({
              name: order.order_item,
              cots: order.item_cost
            });
          }
        }
        for (const order in uniqueOrders) {
          formattedOutput.push(uniqueOrders[order]);
        }

        res.json(formattedOutput);
      })
      .catch(err => {
        res
          .status(500)
          .json({ error: err.message });
      });
  });

  router.put("/orders/", (req, res) => {

    const request = req.body;

    if (request.hasOwnProperty('orderStatus')) {
      switch (request.orderStatus) {
      case 'confirm':
        console.log(request.time_estimate);
        const NOW = moment.now();
        const estimate = moment(NOW)
          .add(request.time_estimate, 'minutes')
          .format("YYYY-MM-DD HH:mm:ss");
        db.query(`
          UPDATE orders
            SET time_confirmed = NOW(),
            time_estimate = $2
          WHERE id = $1
          RETURNING id;
        `, [request.orderId, estimate])
          .then(query => getUserNumber(query.rows[0].id))
          .then((id) => {
            console.log(id);
            res.json({ status: 'success' });
            twilio.messages.create({
              body: `Your order has been confirmed.  It should be ready ${moment(estimate).fromNow()}`,
              to: id.phone_number,
              from: `+12029029010`
            })
              .then((mes) => {
                console.log(mes.sid);
              });
          });
        break;

      case 'deny':
        db.query(`
          UPDATE orders
            SET time_confirmed = '1990-01-01',
            time_complete = '1990-01-01'
          WHERE id = $1
          RETURNING id;
        `, [request.orderId])
          .then(query => getUserNumber(query.rows[0].id)
            .then(id => {
              res.json({ status: 'success' });
              twilio.messages.create({
                body: `Your order has been declined.`,
                to: id.phone_number,
                from: `+12029029010`
              })
                .then((mes) => {
                  console.log(mes.sid);
                });
            }));
        break;

      case 'cancel':
        db.query(`
          UPDATE orders
            SET time_complete = '1990-01-01 00:00:00'
          WHERE id = $1
          RETURNING id;
        `, [request.orderId])
          .then(query => getUserNumber(query.rows[0].id))
          .then(id => {
            res.json({ status: 'success' });
            twilio.messages.create({
              body: `Your order has been cancelled.`,
              to: id.phone_number,
              from: `+12029029010`
            })
              .then((mes) => {
                console.log(mes.sid);
              });
          });
        break;

      case 'estimate':
        db.query(`
          UPDATE orders
            SET time_estimate = $2
          WHERE id = $1
          RETURNING id;
        `, [request.orderId, moment(request.time_estimate).format("YYYY-MM-DD HH:mm:ss")])
          .then(query => getUserNumber(query.rows[0].id))
          .then(id => {
            res.json({ status: 'success' });
            twilio.messages.create({
              body: `The restaurant has changed the estimated time of completion on your order.  Your order is expected to be ready ${
                moment(
                  moment(request.time_estimate).format("YYYY-MM-DD HH:mm:ss")
                ).fromNow()
              }
              `,
              to: id.phone_number,
              from: `+12029029010`
            })
              .then((mes) => {
                console.log(mes.sid);
              });
          });
        break;

      case 'complete':
        db.query(`
          UPDATE orders
            SET time_complete = NOW()
          WHERE id = $1
          RETURNING id;
        `, [request.orderId])
          .then(query => getUserNumber(query.rows[0].id))
          .then(id => {
            res.json({ status: 'success' });
            twilio.messages.create({
              body: `Your order has been complete and is ready for pick up!`,
              to: id.phone_number,
              from: `+120329029010`
            })
              .then((mes) => {
                console.log(mes.sid);
              });
          });
      }
    }
  });
  // twilio.messages.create({
  //   body: 'test message',
  //   to: '+19023945393',
  //   from: '+12029029010'
  // })
  //   .then((mes) => {
  //     console.log(mes.sid);
  //   });

  router.post("/update", (req, res) => {
    // Needs to be notified when a user makes an order to this database.  Going to build the users order query first, then work on this.
    // Will repeat polls to the db as an update loop.  Since order ID's are always unique, it will check them against a Set, and if anything
    // has changed, one of the ID's the user provides won't match.
    const restCache = req.body.orderIds;
    let exceptionString = `
    SELECT orders.id AS id,
      CONCAT(users.first_name, ' ',
          INITCAP(LEFT(users.last_name, 1))) AS customer,
       users.phone_number, orders.id,
       items.name AS order_item, items.cost AS item_cost,
       time_placed, time_confirmed, time_complete
    FROM restaurants
      JOIN orders ON (restaurant_id = restaurants.id)
      JOIN users ON (customer_id = users.id)
      JOIN order_items ON (order_id = orders.id)
      JOIN items ON (item_id = items.id)

    `;
    console.log(restCache);

    if (restCache.length > 0) {
      exceptionString += `WHERE orders.id != `;
    }

    for (let i = 0; i < restCache.length; i++) {
      exceptionString += restCache[i];
      if (i < restCache.length - 1) {
        exceptionString += ' AND orders.id != ';
      } else {
        exceptionString += `;`;
      }
    }
    console.log(exceptionString);

    return db.query(exceptionString)
      .then(query => {
        const data = query.rows;
        const uniqueOrders = {};
        const formattedOutput = [];

        for (const order of data) {
          if (!uniqueOrders.hasOwnProperty(order.id)) {
            uniqueOrders[order.id] = order;
            uniqueOrders[order.id].items = [{
              name: order.order_item,
              cost: order.item_cost
            }];
            delete uniqueOrders[order.id].order_item;
            delete uniqueOrders[order.id].item_cost;
          } else {
            uniqueOrders[order.id].items.push({
              name: order.order_item,
              cots: order.item_cost
            });
          }
        }
        for (const order in uniqueOrders) {
          formattedOutput.push(uniqueOrders[order]);
        }

        res.json(formattedOutput);
      })
      .catch(err => {
        console.log(err.message);
        res
          .status(500)
          .json({ error: err.message });
      });
  });

  router.post("/login", (req, res) => {
    // Will modify this at some point to confirm the user
    // signing in is actually restaurant staff.
    return db.query(`
    SELECT user_token
    FROM users
    WHERE email = $1
      AND password = $2;
  `, [req.body.email.trim(), req.body.password.trim()])
      .then(query => {
        req.session.userToken = query.rows[0].user_token;
        res.send({ success: "Logged in" });
      })
      .catch(err => {
        res.send({ error: err.message });
      });
  });

  return router;
};
